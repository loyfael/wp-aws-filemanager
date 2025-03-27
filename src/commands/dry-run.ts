import { processImages } from '../core/processor'

/**
 * Dry-run mode for migrating images in batch and upload to S3 bucket with metadata update
 */
export async function dryRunCommand() {
  const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10)
  console.log('Dry-run command started. No AWS upload or DB change will occur.')
  
  await processImages(batchSize, { dryRun: true })
}
