import { processImages } from '../core/processor'

/**
 * Migrate images in batch and upload to S3 bucket with metadata update.
 * This command will process all images in the database and upload them to S3.
 */
export async function migrateCommand() {
  const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10)
  await processImages(batchSize, { dryRun: false })
}
