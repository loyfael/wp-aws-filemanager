import { uploadToS3 } from "../aws/uploader";
import { downloadImage } from "../utils/downloader";
import { ProcessImageOptions } from "./processor";
import fs from 'fs/promises';

/**
 * Process the sizes of an image attachment post and upload them to S3
 * @param postId 
 * @param metadata 
 * @param basePath 
 * @param options 
 * @returns 
 */
export async function processSizes(postId: number, metadata: any, basePath: string, options: ProcessImageOptions) {

    // Skip if the sizes are already migrated for this post
    if (!metadata.sizes || typeof metadata.sizes !== 'object') return;

    // Process each size
    for (const sizeName in metadata.sizes) {

        const size = metadata.sizes[sizeName];

        if (!size.file || typeof size.file !== 'string') {
            console.warn(`⚠️ Skipping size '${sizeName}' for post ${postId}: missing 'file'`);
            continue;
        }

        // Skip if the size is already migrated to S3
        if (size.s3) {
            console.log(`⏩ Skipping size '${sizeName}' for post ${postId} (already migrated).`);
            continue;
        }

        // Process the size and upload it to S3
        try {
            const sizeKey = `${basePath}/${size.file}`;
            const sizeTmp = await downloadImage(sizeKey);

            // Upload the size to S3
            const sizeUrl = options.dryRun
                ? `DRY_RUN_S3_URL/${sizeKey}`
                : await uploadToS3(sizeTmp, sizeKey);

            // Update the metadata with the S3 URL of the size
            size.s3 = {
                url: sizeUrl,
                bucket: process.env.AWS_BUCKET_NAME!,
                key: sizeKey,
                provider: 's3',
                'mime-type': size['mime-type'] || 'image/jpeg',
                privacy: 'public-read',
            };

            // Remove the temporary file after upload
            if (!options.dryRun) {
                await fs.unlink(sizeTmp);
            }
        } catch (err) {
            console.warn(`⚠️ Skipping size '${sizeName}' for post ${postId}: ${(err as Error).message}`);
        }
    }
}