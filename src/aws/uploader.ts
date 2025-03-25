// src/s3/uploader.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'

/**
 * S3 client instance with credentials
 */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * Upload file to S3 bucket with key and return the public URL
 * @param filePath 
 * @param key 
 * @returns 
 */
export async function uploadToS3(filePath: string, key: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath)

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: fileStream,
      ACL: 'public-read',
    },
  })

  await upload.done()

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}
