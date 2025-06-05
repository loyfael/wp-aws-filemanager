import { parseMetadata } from '../utils/metadata-parser';
import { processMainImage } from './processMainImage';
import { ProcessImageOptions } from './processor';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

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

export async function processBuffer(rows: any[], options: ProcessImageOptions) {
  for (const row of rows) {
    const postId = row.ID;
    const rawMeta = row.meta_value;
    const metadata = parseMetadata(rawMeta);

    if (!rawMeta || typeof rawMeta !== 'string' || rawMeta.length < 10) {
      console.warn(`⚠️ Possibly corrupt or empty metadata for post ${postId}`);
      continue;
    }

    if (!metadata || typeof metadata !== 'object') {
      console.warn(`⚠️ Invalid parsed metadata for post ${postId}`);
      continue;
    }

    const hasS3Meta = metadata.s3?.url && metadata.s3?.key && metadata.s3?.bucket;
    if (hasS3Meta) {
      const exists = await isImageOnS3(metadata.s3.key);
      if (exists) {
        console.log(`⏩ Skipping post ${postId}, already migrated and exists on S3.`);
        continue;
      } else {
        console.warn(`🔁 Reprocessing post ${postId}: metadata has S3 key but file is missing on S3.`);
      }
    }

    try {
      await processMainImage(postId, metadata, rawMeta, options);
    } catch (err) {
      console.error(`❌ Failed to migrate post ${postId}: ${(err as Error).message}`);
    }
  }
}
