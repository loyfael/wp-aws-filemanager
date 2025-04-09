import dotenv from 'dotenv';
dotenv.config();

import { streamPool } from '../database/mysql-stream';
import { processBuffer } from './processBuffer';

/**
 * Options for the processImages function
 */
export interface ProcessImageOptions {
  dryRun?: boolean;
  batchOffset?: number;
}

/**
 * Process all images in the database, downloading and uploading them to S3.
 * It use a buffer to process images in batch and avoid memory issues.
 * @param batchSize 
 * @param options 
 */
export async function processImages(batchSize: number, options: ProcessImageOptions = {}) {
  console.log('🚀 Migration started...');

  try {
    // Query to get all attachments with metadata
    let offset = (options.batchOffset != undefined) ? options.batchOffset : 0;
    const query = `
    SELECT p.ID, m.meta_value
    FROM M3hSHDUe_posts p
    JOIN M3hSHDUe_postmeta m ON p.ID = m.post_id
    WHERE p.post_type = 'attachment' AND m.meta_key = '_wp_attachment_metadata'
    ORDER BY p.ID
    LIMIT 999999
    OFFSET ` + offset.toString();

    const stream = streamPool.query(query).stream(); // Stream the query result to avoid memory issues
    let buffer: any[] = []; // Buffer to store rows

    // Iterate over the stream of rows from the database query result and process them
    for await (const row of stream) {
      buffer.push(row); // Add row to buffer

      const isDryRunLimitReached = options.dryRun && buffer.length >= 500; // Check if dry-run limit is reached
      const isBatchFull = !options.dryRun && buffer.length >= batchSize; // Check if batch size is reached

      // If dry-run limit is reached or batch is full, process the buffer
      if (isDryRunLimitReached || isBatchFull) {
        await processBuffer(buffer, options); // Process the buffer
        buffer = []; // Clear the buffer

        if (options.dryRun) break; // Break the loop if dry-run limit is reached
      }
    }

    // Process the remaining rows in the buffer if any left after the loop
    if (buffer.length) {
      await processBuffer(buffer, options); // Process the buffer with remaining rows
    }

    console.log(options.dryRun ? 'Dry-run completed.' : 'Migration completed.');
  } catch (error) {
    console.error('Error during migration:', error); // Log any errors that occur during the process
  }
}