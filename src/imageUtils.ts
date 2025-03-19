import { PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";
import { s3 } from "./s3Client";
import { BUCKET_NAME, UPLOADS_PATH, IMAGE_EXTENSIONS } from "./config";
import * as fs from "fs";
import * as path from "path";

// Get the list of images from the uploads directory
export async function getImageList(): Promise<string[]> {
    return fs
        .readdirSync(UPLOADS_PATH)
        .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file)))
        .map((file) => path.join(UPLOADS_PATH, file));
}

/**
 * Upload an image to AWS S3
 * @param imagePath - Path of the image to upload
 * @returns The new URL of the uploaded image or null if failed
 */
export async function uploadFilesToS3(imagePath: string): Promise<string | null> {
    try {
        const fileName = path.basename(imagePath);
        const fileStream = fs.createReadStream(imagePath);

        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: `uploads/${fileName}`,
            Body: fileStream,
            ACL: ObjectCannedACL.public_read,
            ContentType: "image/" + path.extname(fileName).substring(1),
        };

        await s3.send(new PutObjectCommand(uploadParams));

        return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${fileName}`;
    } catch (error) {
        console.error(`Upload failed for ${imagePath}:`, error);
        return null;
    }
}

/**
 * Delete an image from the local storage
 * @param imagePath - Path of the image to delete
 */
export async function deleteLocalImage(imagePath: string) {
    try {
        fs.unlinkSync(imagePath);
        console.log(`Deleted local image: ${imagePath}`);
    } catch (error) {
        console.error(`Failed to delete local image: ${imagePath}`, error);
    }
}
