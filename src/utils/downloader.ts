import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import fsSync from 'fs';

dotenv.config();

const logPath = path.resolve('migration-dl-report.txt');
function log(message: string) {
    fsSync.appendFileSync(logPath, message + '\n');
    console.log(message);
}

/**
 * Download an image from the local filesystem and copy it to a temp file.
 * @param imagePath Relative path from wp-content/uploads (e.g. "2024/06/image.jpg")
 * @returns Absolute path to the temp file
 */
export async function downloadImage(imagePath: string): Promise<string> {
  const uploadsBase = process.env.WP_UPLOADS_ABSOLUTE_PATH;

  if (!uploadsBase) {
    log(`❌ WP_UPLOADS_ABSOLUTE_PATH is not defined in .env`);
    throw new Error('❌ WP_UPLOADS_ABSOLUTE_PATH is not defined in .env');
  }

  if (!imagePath || typeof imagePath !== 'string') {
    log(`❌ Invalid image path: ${imagePath}`);
    throw new Error(`❌ Invalid image path: ${imagePath}`);
  }

  const originalFilePath = path.join(uploadsBase, imagePath);
  const tempFilePath = path.join('/tmp', path.basename(imagePath));

  try {
    // Check if the source file exists
    await fs.access(originalFilePath);

    // Copy it to a temp file
    await fs.copyFile(originalFilePath, tempFilePath);

    console.log(`📥 Copied local image: ${imagePath} → ${tempFilePath}`);
    return tempFilePath;
  } catch (err) {
    log(`❌ Failed to access or copy local image: ${originalFilePath}`);
    console.error(`❌ Failed to access or copy local image: ${originalFilePath}`);
    throw err;
  }
}
