import { uploadToS3 } from "../aws/uploader";
import { downloadImage } from "../utils/downloader";
import fs from 'fs/promises';
import { processSizes } from "./processSizes";
import path from "path";
import { serializeMetadata } from "../utils/metadata-parser";
import { backupMetadata } from "../utils/backup";
import { streamPool } from "../database/mysql-stream";
import { ProcessImageOptions } from "./processor";

/**
 * Process the main image and sizes for a post attachment
 * This permit to migrate the main image and all its sizes to S3
 * @param postId 
 * @param metadata 
 * @param rawMeta 
 * @param options 
 */
export async function processMainImage(postId: number, metadata: any, rawMeta: string, options: ProcessImageOptions) {

    if (!metadata.file || typeof metadata.file !== 'string') {
        console.warn(`⚠️ Skipping post ${postId}: missing or invalid 'file' in metadata.`);
        return;
    }

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