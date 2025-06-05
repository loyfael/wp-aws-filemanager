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
    throw new Error('WP_UPLOADS_ABSOLUTE_PATH is not defined in .env');
  }

  if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
    log(`❌ Invalid image path received: ${JSON.stringify(imagePath)}`);
    throw new Error(`Invalid image path: ${imagePath}`);
  }

  const originalFilePath = path.resolve(uploadsBase, imagePath);
  const tempFilePath = path.resolve('/tmp', path.basename(imagePath));

  try {
    // Log the resolved path
    log(`🔍 Checking file: ${originalFilePath}`);

    // Check existence first
    if (!fsSync.existsSync(originalFilePath)) {
      log(`❌ File does not exist: ${originalFilePath}`);
      throw new Error(`File does not exist: ${originalFilePath}`);
    }

    // Copy the file
    await fs.copyFile(originalFilePath, tempFilePath);

    log(`📥 Copied local image: ${imagePath} → ${tempFilePath}`);
    return tempFilePath;
  } catch (err) {
    log(`❌ Failed to access or copy local image: ${originalFilePath}`);
    log(`   Reason: ${(err as Error).message}`);
    throw err;
  }
}
