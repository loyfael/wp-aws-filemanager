import dotenv from 'dotenv';
dotenv.config();

import { streamPool } from '../database/mysql-stream';
import { parseMetadata } from '../utils/metadata-parser';
import fs from 'fs';
import path from 'path';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import readline from 'readline';
import { appendToLog } from '../utils/logger';
import { WP_TABLE_PREFIX } from '../utils/variable';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const MAX_CONCURRENT_CHECKS = 10;

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

function fileExistsLocally(fileKey: string): boolean {
  const basePath = process.env.WP_UPLOADS_ABSOLUTE_PATH;
  if (!basePath) throw new Error('❌ WP_UPLOADS_ABSOLUTE_PATH is not defined in .env');
  const fullPath = path.join(basePath, fileKey);
  return fs.existsSync(fullPath);
}

async function fileExistsOnS3(key: string): Promise<boolean> {
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

async function auditFilesConcurrently<T>(
  items: T[],
  handler: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const running: Promise<void>[] = [];

  while (queue.length > 0 || running.length > 0) {
    while (running.length < MAX_CONCURRENT_CHECKS && queue.length > 0) {
      const item = queue.shift()!;
      const task = handler(item).catch(err => {
        const msg = `❌ Audit failed: ${(err as Error).message}`;
        console.warn(msg);
        appendToLog(msg);
      });
      running.push(task);
      task.finally(() => {
        const index = running.indexOf(task);
        if (index !== -1) running.splice(index, 1);
      });
    }
    if (running.length > 0) await Promise.race(running);
  }
}

export async function auditImagesCommand() {
  const uploadsRoot = process.env.WP_UPLOADS_ABSOLUTE_PATH;
  if (!uploadsRoot) {
    const msg = '❌ WP_UPLOADS_ABSOLUTE_PATH is not defined.';
    console.error(msg);
    appendToLog(msg);
    process.exit(1);
  }

  const toDeleteLocally: string[] = [];

  const query = `
    SELECT p.ID, m.meta_value
    FROM ${WP_TABLE_PREFIX}_posts p
    JOIN ${WP_TABLE_PREFIX}_postmeta m ON p.ID = m.post_id
    WHERE p.post_type = 'attachment' AND m.meta_key = '_wp_attachment_metadata'
    ORDER BY p.ID
  `;

  const stream = streamPool.query(query).stream();

  for await (const row of stream) {
    const postId = row.ID;
    let metadata;

    try {
      metadata = parseMetadata(row.meta_value);
    } catch {
      const msg = `⚠️ Could not parse metadata for post ${postId}`;
      console.warn(msg);
      appendToLog(msg);
      continue;
    }

    if (!metadata?.file || typeof metadata.file !== 'string') {
      const msg = `⚠️ Post ${postId} has no valid main file`;
      console.warn(msg);
      appendToLog(msg);
      continue;
    }

    const filesToCheck: { label: string; key: string }[] = [];

    // Main image
    if (metadata.s3?.key && typeof metadata.s3.key === 'string') {
      filesToCheck.push({ label: 'main', key: metadata.s3.key });
    } else {
      filesToCheck.push({ label: 'main', key: metadata.file });
    }

    // Sizes
    if (metadata.sizes && typeof metadata.sizes === 'object') {
      for (const [sizeName, sizeData] of Object.entries(metadata.sizes)) {
        if (
          sizeData &&
          typeof sizeData === 'object' &&
          'file' in sizeData &&
          typeof (sizeData as { file: unknown }).file === 'string'
        ) {
          const file = (sizeData as { file: string }).file;
          const sizeKey = path.posix.join(path.posix.dirname(metadata.file), file);
          filesToCheck.push({ label: sizeName, key: sizeKey });
        } else {
          const msg = `⚠️ Invalid size "${sizeName}" for post ${postId}`;
          console.warn(msg);
          appendToLog(msg);
        }
      }
    }

    await auditFilesConcurrently(filesToCheck, async ({ label, key }) => {
      const existsLocally = fileExistsLocally(key);
      const existsOnS3 = await fileExistsOnS3(key);

      console.log(`📦 Post ${postId} - ${label}`);
      console.log(`  ▶ Local: ${existsLocally ? '✅' : '❌'} | S3: ${existsOnS3 ? '✅' : '❌'}`);

      if (!existsLocally) appendToLog(`⚠️ Missing locally: ${key}`);
      if (!existsOnS3) appendToLog(`⚠️ Missing on S3: ${key}`);

      if (existsLocally && existsOnS3) {
        toDeleteLocally.push(key);
      }
    });
  }

  const uniqueToDelete = [...new Set(toDeleteLocally)];
  console.log(`\n🧹 ${uniqueToDelete.length} file(s) could be deleted (they exist both locally and on S3)`);

  const answer = await askQuestion('❓ Do you want to delete them now? (y/N): ');
  if (answer.toLowerCase() === 'y') {
    for (const key of uniqueToDelete) {
      const fullPath = path.join(uploadsRoot, key);
      try {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Deleted: ${key}`);
      } catch (err) {
        const msg = `❌ Failed to delete ${key}: ${(err as Error).message}`;
        console.warn(msg);
        appendToLog(msg);
      }
    }
  } else {
    console.log('🚫 No files were deleted.');
  }

  console.log('✅ Audit complete.');
}
