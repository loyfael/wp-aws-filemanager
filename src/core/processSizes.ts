import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { uploadToS3 } from '../aws/uploader';
import { downloadImage } from '../utils/downloader';
import { ProcessImageOptions } from './processor';
import { lookup as getMimeType } from 'mime-types';

export async function processSizes(postId: number, metadata: any, basePath: string, options: ProcessImageOptions) {
  if (!metadata.sizes || typeof metadata.sizes !== 'object') return;

  for (const sizeName in metadata.sizes) {
    const size = metadata.sizes[sizeName];

    if (!size?.file) {
      console.warn(`⚠️ Skipping size '${sizeName}' for post ${postId}: missing 'file'`);
      continue;
    }

    if (size.s3?.key && size.s3?.url && size.s3?.bucket) {
      console.log(`⏩ Skipping size '${sizeName}' for post ${postId} (already migrated)`);
      continue;
    }

    try {
      const sizeKey = `${basePath}/${size.file}`;
      const tmpFile = await downloadImage(sizeKey);

      console.log(`📤 Uploading size '${sizeName}' for post ${postId}: ${sizeKey}`);

      const result = options.dryRun
        ? {
            url: `DRY_RUN_URL/${sizeKey}`,
            key: sizeKey,
            bucket: process.env.AWS_BUCKET_NAME!,
            size: 0,
            contentType: getMimeType(sizeKey) || 'application/octet-stream',
          }
        : await uploadToS3(tmpFile, sizeKey);

      size.s3 = {
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        provider: 's3',
        'mime-type': result.contentType,
        privacy: 'public-read',
      };

      if (!options.dryRun) {
        await fs.unlink(tmpFile);
      }
    } catch (err) {
      console.error(`⚠️ Failed to process size '${sizeName}' for post ${postId}: ${(err as Error).message}`);
    }
  }
}
