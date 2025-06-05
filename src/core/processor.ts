import dotenv from 'dotenv';
dotenv.config();

import { streamPool } from '../database/mysql-stream';
import { processBuffer } from './processBuffer';

export interface ProcessImageOptions {
  dryRun?: boolean;
  batchOffset?: number;
}

export async function processImages(batchSize: number, options: ProcessImageOptions = {}) {
  console.log('🚀 Starting image processing pipeline...');

  const offset = options.batchOffset ?? 0;
  const query = `
    SELECT p.ID, m.meta_value
    FROM ${process.env.WP_TABLE_PREFIX || 'wp_'}posts p
    JOIN ${process.env.WP_TABLE_PREFIX || 'wp_'}postmeta m ON p.ID = m.post_id
    WHERE p.post_type = 'attachment' AND m.meta_key = '_wp_attachment_metadata'
    ORDER BY p.ID
    LIMIT 999999
    OFFSET ${offset}
  `;

  const stream = streamPool.query(query).stream();
  let buffer: any[] = [];

  let totalRows = 0;
  let totalBatches = 0;

  for await (const row of stream) {
    totalRows++;
    buffer.push(row);

    const isDryRunLimitReached = options.dryRun && buffer.length >= 500;
    const isBatchFull = !options.dryRun && buffer.length >= batchSize;

    if (isDryRunLimitReached || isBatchFull) {
      totalBatches++;
      console.log(`📦 Processing batch #${totalBatches} (${buffer.length} items)`);
      await processBuffer(buffer, options);
      buffer = [];

      if (options.dryRun) break;
    }
  }

  if (buffer.length > 0) {
    totalBatches++;
    console.log(`📦 Processing final batch #${totalBatches} (${buffer.length} items)`);
    await processBuffer(buffer, options);
  }

  console.log(options.dryRun ? '✅ Dry-run completed.' : '✅ Migration completed.');
  console.log(`📊 Total rows retrieved from DB: ${totalRows}`);
  console.log(`📦 Total batches processed: ${totalBatches}`);
}
