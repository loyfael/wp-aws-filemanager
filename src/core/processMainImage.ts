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
    const filePath = metadata.file;
    const localFile = await downloadImage(filePath);
  
    console.log(`📤 Uploading main image for post ${postId}: ${filePath}`);
  
    const mainResult = options.dryRun
      ? { url: `DRY_RUN_S3_URL/${filePath}`, 
        key: filePath, bucket: process.env.AWS_BUCKET_NAME!, 
        size: 0, 
        contentType: getMimeType(filePath) || 'application/octet-stream' }
      : await uploadToS3(localFile, filePath);
  
    metadata.s3 = {
      url: mainResult.url,
      bucket: mainResult.bucket,
      key: mainResult.key,
      provider: 's3',
      'mime-type': mainResult.contentType,
      privacy: 'public-read',
    };
  
    if (!options.dryRun) {
      await fs.unlink(localFile);
    }
  
    await processSizes(postId, metadata, path.posix.dirname(filePath), options);
  
    const newMeta = serializeMetadata(metadata);
  
    if (!options.dryRun) {
      backupMetadata(postId, rawMeta);
      await streamPool.query(
        `UPDATE M3hSHDUe_postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
        [newMeta, postId]
      );
      console.log(`✅ Migrated post ${postId} (main + sizes)`);
    } else {
      console.log(`(Dry-run) Would migrate post ${postId} + sizes`);
    }
  }