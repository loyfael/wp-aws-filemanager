import path from 'path';
import fs from 'fs/promises';
import { downloadImage } from '../utils/downloader';
import { uploadToS3 } from '../aws/uploader';
import { processSizes } from './processSizes';
import { serializeMetadata } from '../utils/metadata-parser';
import { backupMetadata } from '../utils/backup';
import { streamPool } from '../database/mysql-stream';
import { ProcessImageOptions } from './processor';
import { lookup as getMimeType } from 'mime-types';

export async function processMainImage(postId: number, metadata: any, rawMeta: string, options: ProcessImageOptions) {
  const filePath = metadata.file;

  if (!filePath || typeof filePath !== 'string') {
    console.warn(`⚠️ Skipping post ${postId}: invalid "file" path: ${filePath}`);
    return;
  }

  if (metadata.s3?.key && metadata.s3?.url && metadata.s3?.bucket) {
    console.log(`⏩ Main image already migrated for post ${postId}, skipping upload.`);
  } else {
    try {
      const localFile = await downloadImage(filePath);
      console.log(`📤 Uploading main image for post ${postId}: ${filePath}`);

      const result = options.dryRun
        ? {
            url: `DRY_RUN_URL/${filePath}`,
            key: filePath,
            bucket: process.env.AWS_BUCKET_NAME!,
            size: 0,
            contentType: getMimeType(filePath) || 'application/octet-stream',
          }
        : await uploadToS3(localFile, filePath);

      metadata.s3 = {
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        provider: 's3',
        'mime-type': result.contentType,
        privacy: 'public-read',
      };

      if (!options.dryRun) {
        await fs.unlink(localFile);
      }
    } catch (err) {
      console.error(`❌ Failed to upload main image for post ${postId}: ${(err as Error).message}`);
      return;
    }
  }

  await processSizes(postId, metadata, path.posix.dirname(filePath), options);

  const newMeta = serializeMetadata(metadata);

  if (!options.dryRun) {
    backupMetadata(postId, rawMeta);
    await streamPool.promise().query(
      `UPDATE ${process.env.WP_TABLE_PREFIX || 'wp_'}postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
      [newMeta, postId]
    );
    console.log(`✅ Migrated post ${postId}`);
  } else {
    console.log(`(Dry-run) Would migrate post ${postId} + sizes`);
  }
}
