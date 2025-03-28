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
    for (const row of rows) {
      const postId = row.ID;
      const rawMeta = row.meta_value;
      const metadata = parseMetadata(rawMeta);
  
      if (metadata?.s3) {
        console.log(`⏩ Skipping post ${postId}, already migrated.`);
        continue;
      }
  
      try {
        await processMainImage(postId, metadata, rawMeta, options);
      } catch (err) {
        console.error(`❌ Failed to migrate post ${postId}: ${(err as Error).message}`);
      }
    }
  }