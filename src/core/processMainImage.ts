import { uploadToS3 } from "../aws/uploader";
import { downloadImage } from "../utils/downloader";
import fs from 'fs/promises';
import { processSizes } from "./processSizes";
import path from "path";
import { serializeMetadata } from "../utils/metadata-parser";
import { backupMetadata } from "../utils/backup";
import { streamPool } from "../database/mysql-stream";
import { ProcessImageOptions } from "./processor";
import { lookup as getMimeType } from 'mime-types';

/**
 * Process the main image and sizes for a post attachment
 * This permit to migrate the main image and all its sizes to S3
 * @param postId 
 * @param metadata 
 * @param rawMeta 
 * @param options 
 */
export async function processMainImage(postId: number, metadata: any, rawMeta: string, options: ProcessImageOptions) {
  const filePath = metadata.file; // Get the main file path

  if (!filePath || typeof filePath !== 'string') {
    console.warn(`⚠️ Skipping post ${postId}: no valid "file" path in metadata. Value of "file": ${filePath}. Are you sure this file exists?`);
    return;
  }

  /**
   * Skip upload if the image has already been migrated to S3
   */
  if (metadata.s3?.url && metadata.s3?.key && metadata.s3?.bucket) {
    console.log(`⏩ Main image already migrated for post ${postId}, skipping upload.`);
  } else {
    try {
      const localFile = await downloadImage(filePath); // Download the main image
      console.log(`📤 Uploading main image for post ${postId}: ${filePath}`);

      /**
       * Upload the main image to S3 and get the result structure
       * If dry-run is enabled, return a fake result
       */
      const mainResult = options.dryRun
        ? {
          url: `DRY_RUN_S3_URL/${filePath}`,
          key: filePath,
          bucket: process.env.AWS_BUCKET_NAME!,
          size: 0,
          contentType: getMimeType(filePath) || 'application/octet-stream',
        }
        : await uploadToS3(localFile, filePath);

      // Update the metadata with the new S3 block
      metadata.s3 = {
        url: mainResult.url,
        bucket: mainResult.bucket,
        key: mainResult.key,
        provider: 's3',
        'mime-type': mainResult.contentType,
        privacy: 'public-read',
      };

      // Remove the local file if not in dry-run
      if (!options.dryRun) {
        await fs.unlink(localFile);
      }

    } catch (error) {
      console.error(`❌ Failed to upload main image for post ${postId}: ${(error as Error).message}`);
      return;
    }
  }

  await processSizes(postId, metadata, path.posix.dirname(filePath), options); // Process the sizes

  const newMeta = serializeMetadata(metadata); // Serialize the new metadata

  /**
   * Update the post metadata with the new metadata
   * If dry-run is enabled, skip the update
   * else backup the metadata and update the database
   */
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
