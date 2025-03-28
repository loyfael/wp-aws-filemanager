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

  /**
   * Iterate over the rows and process them one by one
   * If the post already have a s3 metadata, skip it
   * Else process the main image and sizes
   */
  for (const row of rows) {
    const postId = row.ID; // Get the post ID
    const rawMeta = row.meta_value; // Get the raw metadata
    const metadata = parseMetadata(rawMeta); // Parse the metadata

    /**
     * Skip the post if it already have a s3 metadata
     * This permit to avoid processing the same post multiple times
     */
    if (metadata?.s3) {
      console.log(`⏩ Skipping post ${postId}, already migrated.`);
      continue;
    }

    /**
     * Process the main image and sizes for the post
     * If an error occur, log it and continue to the next post
     */
    try {
      await processMainImage(postId, metadata, rawMeta, options);
    } catch (err) {
      console.error(`❌ Failed to migrate post ${postId}: ${(err as Error).message}`);
    }
  }
}