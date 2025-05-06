import { processImages } from '../core/processor';

/**
 * Simulate a migration of images in batch without modifying or uploading anything.
 * This command will process a limited number of images and simulate all operations without any real effect.
 */
export async function migrateDryRunCommand() {
  try {
    // Hard limit batch size to 500 max to ensure safety in dry-run
    const batchSize = 500;
    const batchOffset = parseInt(process.env.BATCH_OFFSET || '0', 10);

    console.log('🧪 Starting dry-run migration...');
    console.log(`🔒 Dry-run mode enabled — no upload or database write will occur.`);
    console.log(`📦 Max one batch of up to ${batchSize} items will be simulated.`);

    await processImages(batchSize, {
      dryRun: true,
      batchOffset: batchOffset,
    });

    console.log('🧪 Dry-run migration completed. No data was modified or uploaded.');
  } catch (error) {
    console.error('❌ Error during dry-run migration:', error);
    process.exit(1);
  }
}
