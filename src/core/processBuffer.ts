import { parseMetadata } from "../utils/metadata-parser";
import { processMainImage } from "./processMainImage";
import { ProcessImageOptions } from "./processor";

/**
 * Process a buffer of rows from the database query result.
 * Permit to process multiple rows at once instead of one by one.
 * @param rows 
 * @param options 
 */
export async function processBuffer(rows: any[], options: ProcessImageOptions) {
  try {
    /**
     * Iterate over the rows and process them one by one
     * If the post already has an S3 metadata, skip it
     * Else process the main image and sizes
     */
    for (const row of rows) {
      const postId = row.ID; // Get the post ID
      const rawMeta = row.meta_value; // Get the raw metadata
      const metadata = parseMetadata(rawMeta); // Parse the metadata

      if (!metadata || typeof metadata !== 'object') {
        console.warn(`⚠️ Skipping post ${postId}: invalid metadata. Metadata: ${metadata}`);
        continue;
      }

      /**
       * Skip the post if it already has an S3 metadata
       * This avoids processing the same post multiple times
       */
      if (metadata.s3?.url && metadata.s3?.key && metadata.s3?.bucket) {
        console.log(`⏩ Skipping post ${postId}, already migrated.`);
        continue;
      }

      /**
       * Process the main image and sizes for the post
       * If an error occurs, log it and continue to the next post
       */
      try {
        await processMainImage(postId, metadata, rawMeta, options);
      } catch (err) {
        console.error(`❌ Failed to migrate post ${postId}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    console.error(`❌ Failed to process buffer: ${(err as Error).message}`);
  }
}
