import { processImages } from '../core/processor'

/**
 * Migrate images in batch and upload to S3 bucket with metadata update
 */
export async function migrateCommand() {
  const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10)
  await processImages(batchSize, { dryRun: false })
}
