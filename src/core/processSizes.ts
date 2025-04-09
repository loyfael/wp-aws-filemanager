import { uploadToS3 } from "../aws/uploader";
import { downloadImage } from "../utils/downloader";
import { ProcessImageOptions } from "./processor";
import { lookup as getMimeType } from 'mime-types';
import fs from 'fs/promises';

/**
 * Process the sizes of an image attachment post and upload them to S3.
 * Also update the metadata with the new S3 URLs.
 * @param postId 
 * @param metadata 
 * @param basePath 
 * @param options 
 * @returns 
 */
export async function processSizes(postId: number, metadata: any, basePath: string, options: ProcessImageOptions) {
    try {
        // Skip if no sizes object or not an object
        if (!metadata.sizes || typeof metadata.sizes !== 'object') return;

        for (const sizeName in metadata.sizes) {
            const size = metadata.sizes[sizeName];

            // If already migrated (with valid S3 data), skip
            if (size.s3?.url && size.s3?.key && size.s3?.bucket) {
                console.log(`⏩ Skipping size '${sizeName}' for post ${postId} (already migrated).`);
                continue;
            }

            try {
                const sizeKey = `${basePath}/${size.file}`;
                const sizeTmp = await downloadImage(sizeKey);

                console.log(`📤 Uploading size '${sizeName}' for post ${postId}: ${sizeKey}`);

                const sizeResult = options.dryRun
                    ? {
                        url: `DRY_RUN_S3_URL/${sizeKey}`,
                        key: sizeKey,
                        bucket: process.env.AWS_BUCKET_NAME!,
                        size: 0,
                        contentType: getMimeType(sizeKey) || 'application/octet-stream',
                    }
                    : await uploadToS3(sizeTmp, sizeKey);

                // Attach new S3 metadata to the size
                size.s3 = {
                    url: sizeResult.url,
                    bucket: sizeResult.bucket,
                    key: sizeResult.key,
                    provider: 's3',
                    'mime-type': sizeResult.contentType,
                    privacy: 'public-read',
                };

                // Delete the temporary file if not in dry-run mode
                if (!options.dryRun) {
                    await fs.unlink(sizeTmp);
                }

            } catch (err) {
                console.warn(`⚠️ Skipping size '${sizeName}' for post ${postId}: ${(err as Error).message}`);
            }
        }
    } catch (err) {
        console.error(`❌ Failed to process sizes for post ${postId}: ${(err as Error).message}`);
    }
}
