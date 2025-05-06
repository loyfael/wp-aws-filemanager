import path from "path";
import fsSync from 'fs';
import { parseMetadata } from "../utils/metadata-parser";
import { processMainImage } from "./processMainImage";
import { ProcessImageOptions } from "./processor";
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const logPath = path.resolve('migration-report.txt');
function log(message: string) {
    fsSync.appendFileSync(logPath, message + '\n');
    console.log(message);
}


const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function isImageOnS3(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Process a buffer of rows from the database query result.
 */
export async function processBuffer(rows: any[], options: ProcessImageOptions) {
  try {
    for (const row of rows) {
      const postId = row.ID;
      const rawMeta = row.meta_value;
      const metadata = parseMetadata(rawMeta);

      if (!rawMeta || typeof rawMeta !== 'string' || rawMeta.length < 10) {
        const msg = `⚠️ Possibly corrupt or empty metadata for post ${postId}`;
        console.warn(msg);
        log(msg);
        continue;
      }

      if (!metadata || typeof metadata !== 'object') {
        const msg = `⚠️ Skipping post ${postId}: metadata parsing failed or invalid.`;
        console.warn(msg);
        log(msg);
        continue;
      }

      const hasS3Meta = metadata.s3?.url && metadata.s3?.key && metadata.s3?.bucket;

      if (hasS3Meta && !options.dryRun) {
        const exists = await isImageOnS3(metadata.s3.key);
        if (exists) {
          const msg = `⏩ Skipping post ${postId}, already migrated and exists on S3.`;
          console.log(msg);
          log(msg);
          continue;
        } else {
          const msg = `🔁 [REMIGRATED] Post ${postId} had S3 key but file is missing on AWS. Reprocessing...`;
          console.warn(msg);
          log(msg);
        }
      }

      try {
        await processMainImage(postId, metadata, rawMeta, options);
        const msg = `✅ Migrated post ${postId}`;
        console.log(msg);
        log(msg);
      } catch (err) {
        const msg = `❌ Failed to migrate post ${postId}: ${(err as Error).message}`;
        console.error(msg);
        log(msg);
      }
    }
  } catch (err) {
    console.error(`❌ Failed to process buffer: ${(err as Error).message}`);
  }
}
