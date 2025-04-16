import { uploadToS3 } from "../aws/uploader";
import { downloadImage } from "../utils/downloader";
import { ProcessImageOptions } from "./processor";
import { lookup as getMimeType } from 'mime-types';
import fs from 'fs/promises';
import path from 'path';
import fsSync from 'fs';

// ---------- Log system ----------
const logPath = path.resolve('migration-sizes-report.txt');
function log(message: string) {
    fsSync.appendFileSync(logPath, message + '\n');
    console.log(message);
}

/**
 * Process the sizes of an image attachment post and upload them to S3.
 * Also update the metadata with the new S3 URLs.
 * @param postId 
 * @param metadata 
 * @param basePath 
 * @param options 
 */
export async function processSizes(postId: number, metadata: any, basePath: string, options: ProcessImageOptions) {
    try {
        if (!metadata.sizes || typeof metadata.sizes !== 'object') return;

        for (const sizeName in metadata.sizes) {
            const size = metadata.sizes[sizeName];

            if (
                !size ||
                typeof size !== 'object' ||
                typeof size.file !== 'string' ||
                !size.file.trim()
            ) {
                console.log(`⚠️ Skipping size '${sizeName}' for post ${postId}: invalid or missing 'file' field.`);
                continue;
            }

            if (size.s3?.url && size.s3?.key && size.s3?.bucket) {
                console.log(`⏩ Skipping size '${sizeName}' for post ${postId} (already migrated).`);
                continue;
            }

            try {
                const sizeKey = `${basePath}/${size.file}`;
                const sizeTmp = await downloadImage(sizeKey);

                log(`📤 Uploading size '${sizeName}' for post ${postId}: ${sizeKey}`);

                const sizeResult = options.dryRun
                    ? {
                        url: `DRY_RUN_S3_URL/${sizeKey}`,
                        key: sizeKey,
                        bucket: process.env.AWS_BUCKET_NAME!,
                        size: 0,
                        contentType: getMimeType(sizeKey) || 'application/octet-stream',
                    }
                    : await uploadToS3(sizeTmp, sizeKey);

                size.s3 = {
                    url: sizeResult.url,
                    bucket: sizeResult.bucket,
                    key: sizeResult.key,
                    provider: 's3',
                    'mime-type': sizeResult.contentType,
                    privacy: 'public-read',
                };

                if (!options.dryRun) {
                    await fs.unlink(sizeTmp);
                }

            } catch (err) {
                console.log(`⚠️ Skipping size '${sizeName}' for post ${postId}: ${(err as Error).message}`);
            }
        }
    } catch (err) {
        log(`❌ Failed to process sizes for post ${postId}: ${(err as Error).message}`);
    }
}
