import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { lookup as getMimeType } from 'mime-types';
import fs from 'fs';

/**
 * Upload result structure for S3 uploads
 */
interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

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
 * Upload a file to S3 and return structured result.
 * @param filePath Local file path
 * @param key Key (path) in the S3 bucket
 */
export async function uploadToS3(filePath: string, key: string): Promise<UploadResult> {

  try {
    const fileStream = fs.createReadStream(filePath); // Create a readable stream from the file
    const fileStat = fs.statSync(filePath); // Get file stats
    const contentType = getMimeType(filePath) || 'application/octet-stream'; // Get file MIME type
  
    const bucket = process.env.AWS_BUCKET_NAME!; // Get the bucket name
    const region = process.env.AWS_REGION!; // Get the region
  
    /**
     * Create a new upload instance with the S3 client and the upload parameters
     * This will upload the file to the S3 bucket
     * and return a promise that resolves when the upload is done
     */
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
  
    await upload.done(); // Wait for the upload to finish
  
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`; // Generate the public URL
  
    return {
      url: publicUrl,
      key,
      bucket,
      size: fileStat.size,
      contentType,
    };
  } catch (error) {
    console.log(`Failed to upload file to S3: ${error}`);
    throw error;
  }
}
