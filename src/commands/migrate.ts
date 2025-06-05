import { processImages } from '../core/processor';

/**
 * Migrate images in batch and upload to S3 bucket with metadata update.
 */
export async function migrateCommand() {
  try {
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
    const batchOffset = parseInt(process.env.BATCH_OFFSET || '0', 10);

    console.log('🚀 Starting image migration...');
    console.log(`🧮 Batch size     : ${batchSize}`);
    console.log(`↪️  Batch offset   : ${batchOffset}`);

    await processImages(batchSize, {
      dryRun: false,
      batchOffset,
    });

    console.log('✅ Migration process completed.');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}
