import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { lookup as getMimeType } from 'mime-types';
import fs from 'fs';

interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

/**
 * S3 client instance
 */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a file to S3 and return structured result.
 * @param filePath Local file path
 * @param key Key (path) in the S3 bucket
 */
export async function uploadToS3(filePath: string, key: string): Promise<UploadResult> {
  const fileStream = fs.createReadStream(filePath);
  const fileStat = fs.statSync(filePath);
  const contentType = getMimeType(filePath) || 'application/octet-stream';

  const bucket = process.env.AWS_BUCKET_NAME!;
  const region = process.env.AWS_REGION!;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ACL: 'public-read',
      ContentType: contentType,
    },
  });

  await upload.done();

  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return {
    url: publicUrl,
    key,
    bucket,
    size: fileStat.size,
    contentType,
  };
}
