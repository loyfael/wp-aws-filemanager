import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs/promises';
import { pool } from '../database/mysql';
import { parseMetadata, serializeMetadata } from '../utils/metadata-parser';
import { downloadImage } from '../utils/downloader';
import { uploadToS3 } from '../aws/uploader';
import { backupMetadata } from '../utils/backup';

/**
 * Options for the processImages function.
 */
interface ProcessImageOptions {
  dryRun?: boolean;
}

/**
 * Process images in batch and upload to S3 bucket with metadata update.
 * Can use dry-run mode to skip actual upload and DB change.
 * Also backup the original metadata before update.
 * @param batchSize 
 * @param options 
 */
export async function processImages(batchSize: number, options: ProcessImageOptions = {}) {

  // ---------- Main command ----------
  console.log('🚀 Migration started..');

  // Fetch attachments in batch from the database (only ID is needed)
  const [attachments]: any[] = await pool.query(
    `SELECT ID FROM M3hSHDUe_posts WHERE post_type = 'attachment' LIMIT ?`,
    [batchSize]
  );

  // Process each attachment in the batch sequentially
  for (const row of attachments) {

    // Extract post ID
    const postId = row.ID;

    // Fetch metadata for the post ID from the database (only _wp_attachment_metadata is needed)
    const [metaRows]: any[] = await pool.query(
      `SELECT meta_value FROM M3hSHDUe_postmeta WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
      [postId]
    );

    // Skip if no metadata found for the post 
    if (!metaRows.length) continue;

    // Extract raw metadata string from the database
    const rawMeta = metaRows[0].meta_value;

    // Parse metadata from the raw string
    const metadata = parseMetadata(rawMeta);

    // Skip if already migrated (has S3 URL)
    if (metadata?.s3) {
      console.log(`Skipping post ${postId}, already migrated.`);
      continue;
    }

    // Process the main image and sizes sequentially for the post ID
    try {
      // Download the main image file
      const filePath = metadata.file;

      // Skip if no main image file found in the metadata
      const localFile = await downloadImage(filePath);

      // Upload the main image file to S3 bucket
      const mainUrl = options.dryRun
        ? `DRY_RUN_S3_URL/${filePath}`
        : await uploadToS3(localFile, filePath);

      // Update the metadata with the S3 URL
      metadata.s3 = {
        url: mainUrl,
        bucket: process.env.AWS_BUCKET_NAME!,
        key: filePath,
        provider: 's3',
        'mime-type': 'image/jpeg',
        privacy: 'public-read',
      };

      // Remove the local file after upload
      if (!options.dryRun) {
        await fs.unlink(localFile);
      }

      // Process each size in the metadata sequentially
      const basePath = path.posix.dirname(filePath);

      // Skip if no sizes found in the metadata
      if (metadata.sizes && typeof metadata.sizes === 'object') {

        // Process each size sequentially for the post ID
        for (const sizeName in metadata.sizes) {
          const size = metadata.sizes[sizeName];

          // Skip if already migrated (has S3 URL)
          if (size.s3) {
            console.log(`Skipping size '${sizeName}' for post ${postId} (already migrated).`);
            continue;
          }

          // Download the size image file for the post ID
          try {
            // Download the size image file for the post ID
            const sizeKey = `${basePath}/${size.file}`;
            const sizeTmp = await downloadImage(sizeKey);

            // Upload the size image file to S3 bucket
            const sizeUrl = options.dryRun
              ? `DRY_RUN_S3_URL/${sizeKey}`
              : await uploadToS3(sizeTmp, sizeKey);

            // Update the metadata with the S3 URL
            size.s3 = {
              url: sizeUrl,
              bucket: process.env.AWS_BUCKET_NAME!,
              key: sizeKey,
              provider: 's3',
              'mime-type': size['mime-type'] || 'image/jpeg',
              privacy: 'public-read',
            };

            // Remove the local file after upload
            if (!options.dryRun) {
              await fs.unlink(sizeTmp);
            }

          } catch (err) {
            console.warn(
              `⚠️ Skipping size '${sizeName}' for post ${postId}: ${(err as Error).message}`
            );
          }
        }
      }

      // Serialize the updated metadata back to string
      const newMeta = serializeMetadata(metadata);

      // Update the metadata in the database for the post ID
      if (!options.dryRun) {
        // Backup the original metadata before update
        backupMetadata(postId, rawMeta);

        // Update the metadata in the database
        await pool.query(
          `UPDATE M3hSHDUe_postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
          [newMeta, postId]
        );

        console.log(`✅ Migrated post ${postId} (main + sizes)`);
      } else {
        console.log(`(Dry-run) Would migrate post ${postId} + sizes`);
      }

    } catch (err) {
      console.error(`❌ Failed to migrate post ${postId}: ${(err as Error).message}`);
    }
  }

  console.log(options.dryRun ? 'Dry-run completed.' : 'Migration completed.');
}