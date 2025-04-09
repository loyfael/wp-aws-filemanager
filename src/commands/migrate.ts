import { processImages } from '../core/processor'

/**
 * Migrate images in batch and upload to S3 bucket with metadata update.
 * This command will process all images in the database and upload them to S3.
 */
export async function migrateCommand() {
   try {
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10)
    const batchOffset = parseInt(process.env.BATCH_OFFSET || '0', 10)
    await processImages(batchSize, { dryRun: false,
      batchOffset: batchOffset
    })
  } catch (error) {
    console.error('Error during migration:', error)
    process.exit(1)
  }
}
