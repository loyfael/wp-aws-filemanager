import { streamPool } from '../database/mysql-stream';
import dotenv from 'dotenv';
import { phpUnserialize } from 'phpunserialize';

dotenv.config();

/**
 * List all images with metadata using stream
 */
export async function listCommand() {
  console.log("🔍 Streaming WordPress images with metadata...");

  const query = `
    SELECT p.ID, p.post_title, pm.meta_value
    FROM M3hSHDUe_posts p
    JOIN M3hSHDUe_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'attachment'
    AND pm.meta_key = '_wp_attachment_metadata'
  `;

  const stream = streamPool.query(query).stream();

  let count = 0;

  interface Metadata {
    file: string;
    sizes?: Record<string, SizeData>;
  }

  interface SizeData {
    width: number;
    height: number;
    file: string;
  }

  stream.on('data', (row: any) => {
    count++;
    try {
      const raw = phpUnserialize(row.meta_value) as Record<string, any>;
      const metadata: Metadata = {
        file: raw.file,
        sizes: raw.sizes ?? {},
      };

      console.log(`📸 #${count}: ${row.post_title}`);
      console.log(`  ▶ Original: ${metadata.file}`);
      Object.entries(metadata.sizes || {}).forEach(([size, data]) => {
        console.log(`  - ${size}: ${data.file} (${data.width}x${data.height})`);
      });
    } catch (e) {
      console.error(`❌ Failed to parse metadata for ID ${row.ID}`, e);
    }
  });

  stream.on('end', () => {
    console.log(`✅ Finished streaming ${count} images.`);
  });

  stream.on('error', (err: Error) => {
    console.error('❌ Error during streaming:', err);
  });
}
