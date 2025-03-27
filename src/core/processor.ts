import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { streamPool } from '../database/mysql-stream';
import { parseMetadata, serializeMetadata } from '../utils/metadata-parser';
import { downloadImage } from '../utils/downloader';
import { uploadToS3 } from '../aws/uploader';
import { backupMetadata } from '../utils/backup';
import { processBuffer } from './processBuffer';

/**
 * Options for the processImages function
 */
export interface ProcessImageOptions {
  dryRun?: boolean;
}

/**
 * Process all images in the database, downloading and uploading them to S3
 * @param batchSize 
 * @param options 
 */
export async function processImages(batchSize: number, options: ProcessImageOptions = {}) {
  console.log('🚀 Migration started...');

  // Query all attachment posts with metadata
  const query = `
    SELECT p.ID, m.meta_value
    FROM M3hSHDUe_posts p
    JOIN M3hSHDUe_postmeta m ON p.ID = m.post_id
    WHERE p.post_type = 'attachment' AND m.meta_key = '_wp_attachment_metadata'
  `;

  // Stream the query results
  const stream = streamPool.query(query).stream();

  // Buffer for batch processing of rows. Permit to process multiple rows at once
  let buffer: any[] = [];

  // Iterate over the stream and process the rows
  for await (const row of stream) {

    // Push the row to the buffer
    buffer.push(row);

    // Check if the buffer is full or the dry-run limit is reached
    const isDryRunLimitReached = options.dryRun && buffer.length >= 500;
    const isBatchFull = !options.dryRun && buffer.length >= batchSize;

    if (isDryRunLimitReached || isBatchFull) {
      await processBuffer(buffer, options);
      buffer = [];

      if (options.dryRun) break; // Only one sequence in dry-run mode
    }
  }

  // Process the remaining rows in the buffer
  if (buffer.length) {
    await processBuffer(buffer, options);
  }

  console.log(options.dryRun ? 'Dry-run completed.' : 'Migration completed.');
}

// Process the main image and sizes for a post
async function processMainImage(postId: number, metadata: any, rawMeta: string, options: ProcessImageOptions) {
  const filePath = metadata.file;
  const localFile = await downloadImage(filePath);

  const mainUrl = options.dryRun
    ? `DRY_RUN_S3_URL/${filePath}`
    : await uploadToS3(localFile, filePath);

  metadata.s3 = {
    url: mainUrl,
    bucket: process.env.AWS_BUCKET_NAME!,
    key: filePath,
    provider: 's3',
    'mime-type': 'image/jpeg',
    privacy: 'public-read',
  };

  if (!options.dryRun) {
    await fs.unlink(localFile);
  }

  await processSizes(postId, metadata, path.posix.dirname(filePath), options);

  const newMeta = serializeMetadata(metadata);

  if (!options.dryRun) {
    backupMetadata(postId, rawMeta);
    await streamPool.promise().query(
      `UPDATE M3hSHDUe_postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
      [newMeta, postId]
    );

    console.log(`✅ Migrated post ${postId} (main + sizes)`);
  } else {
    console.log(`(Dry-run) Would migrate post ${postId} + sizes`);
  }
}

// Process the sizes for a post metadata
async function processSizes(postId: number, metadata: any, basePath: string, options: ProcessImageOptions) {
  if (!metadata.sizes || typeof metadata.sizes !== 'object') return;

  for (const sizeName in metadata.sizes) {
    const size = metadata.sizes[sizeName];

    if (size.s3) {
      console.log(`⏩ Skipping size '${sizeName}' for post ${postId} (already migrated).`);
      continue;
    }

    try {
      const sizeKey = `${basePath}/${size.file}`;
      const sizeTmp = await downloadImage(sizeKey);

      const sizeUrl = options.dryRun
        ? `DRY_RUN_S3_URL/${sizeKey}`
        : await uploadToS3(sizeTmp, sizeKey);

      size.s3 = {
        url: sizeUrl,
        bucket: process.env.AWS_BUCKET_NAME!,
        key: sizeKey,
        provider: 's3',
        'mime-type': size['mime-type'] || 'image/jpeg',
        privacy: 'public-read',
      };

      if (!options.dryRun) {
        await fs.unlink(sizeTmp);
      }
    } catch (err) {
      console.warn(`⚠️ Skipping size '${sizeName}' for post ${postId}: ${(err as Error).message}`);
    }
  }
}
