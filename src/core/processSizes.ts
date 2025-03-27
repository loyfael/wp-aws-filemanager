import { uploadToS3 } from "../aws/uploader";
import { downloadImage } from "../utils/downloader";
import { ProcessImageOptions } from "./processor";
import fs from 'fs/promises';

export async function processSizes(postId: number, metadata: any, basePath: string, options: ProcessImageOptions) {
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