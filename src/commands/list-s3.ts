// src/commands/list-s3.ts
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Create new S3 client instance
 */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * List all objects in the S3 bucket and print them to the console.
 * @returns 
 */
export async function listS3Command() {
  console.log(`📦 Listing objects in bucket ${process.env.AWS_BUCKET_NAME}...`);

  try {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME!,
      MaxKeys: 99999,
    }));

    if (!result.Contents || result.Contents.length === 0) {
      console.log('❌ No objects found.');
      return;
    }

    for (const obj of result.Contents) {
      console.log(`- ${obj.Key} (${obj.Size} bytes)`);
    }

    console.log(`✅ ${result.Contents.length} object(s) found.`);
  } catch (err) {
    console.error('❌ Failed to list S3 objects:', (err as Error).message);
  }
}
