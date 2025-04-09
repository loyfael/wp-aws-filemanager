import { processImages } from '../core/processor'

/**
 * Dry-run mode for migrating images in batch and upload to S3 bucket with metadata update.
 * This command will process all images in the database and simulate the upload to S3.
 */
export async function dryRunCommand() {
  try {
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10)
    const batchOffset = parseInt(process.env.BATCH_OFFSET || '0', 10)
    console.log('Dry-run command started. No AWS upload or DB change will occur.')
    console.log('Batch size:', batchSize)
    console.log('\n'.repeat(2))

    await processImages(batchSize, {
      dryRun: true,
      batchOffset: batchOffset
    })
  } catch (error) {
    console.error('Error during dry-run:', error)
  }
  
  console.log('Dry-run command completed.')
}
