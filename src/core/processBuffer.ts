import { parseMetadata } from "../utils/metadata-parser";
import { processMainImage } from "./processMainImage";
import { ProcessImageOptions } from "./processor";

export async function processBuffer(rows: any[], options: ProcessImageOptions) {
  for (const row of rows) {
    const postId = row.ID;
    const rawMeta = row.meta_value;
    const metadata = parseMetadata(rawMeta);

    // Skip if the main image is already migrated
    if (metadata?.s3) {
      console.log(`⏩ Skipping post ${postId}, already migrated.`);
      continue;
    }

    // Process the main image and sizes
    try {
      await processMainImage(postId, metadata, rawMeta, options);
    } catch (err) {
      console.error(`❌ Failed to migrate post ${postId}: ${(err as Error).message}`);
    }
  }
}