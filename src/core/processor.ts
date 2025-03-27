import dotenv from 'dotenv';
dotenv.config();

import { streamPool } from '../database/mysql-stream';
import { processBuffer } from './processBuffer';

/**
 * Options for the processImages function
 */
export interface ProcessImageOptions {
  dryRun?: boolean;
}

/**
 * Process all images in the database, downloading and uploading them to S3
 * @param batchSize 
 * @param options 
 */
export async function processImages(batchSize: number, options: ProcessImageOptions = {}) {
  console.log('🚀 Migration started...');

  // Query all attachment posts with metadata
  const query = `
    SELECT p.ID, m.meta_value
    FROM M3hSHDUe_posts p
    JOIN M3hSHDUe_postmeta m ON p.ID = m.post_id
    WHERE p.post_type = 'attachment' AND m.meta_key = '_wp_attachment_metadata'
  `;

  // Stream the query results
  const stream = streamPool.query(query).stream();

  // Buffer for batch processing of rows. Permit to process multiple rows at once
  let buffer: any[] = [];

  // Iterate over the stream and process the rows
  for await (const row of stream) {

    // Push the row to the buffer
    buffer.push(row);

    // Check if the buffer is full or the dry-run limit is reached
    const isDryRunLimitReached = options.dryRun && buffer.length >= 500;
    const isBatchFull = !options.dryRun && buffer.length >= batchSize;

    if (isDryRunLimitReached || isBatchFull) {
      await processBuffer(buffer, options);
      buffer = [];

      if (options.dryRun) break; // Only one sequence in dry-run mode
    }
  }

  // Process the remaining rows in the buffer
  if (buffer.length) {
    await processBuffer(buffer, options);
  }

  console.log(options.dryRun ? 'Dry-run completed.' : 'Migration completed.');
}