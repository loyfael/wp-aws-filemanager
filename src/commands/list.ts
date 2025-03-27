import dotenv from 'dotenv';
import { streamPool } from '../database/mysql-stream';
import { unserialize } from 'php-serialize';

dotenv.config();

// ---------- Types ----------
interface SizeData {
  width: number;
  height: number;
  file: string;
}

interface Metadata {
  file: string;
  sizes?: Record<string, SizeData>;
}

interface Row {
  ID: number;
  post_title: string;
  meta_value: string;
}

// ---------- Main command ----------
export async function listCommand() {
  console.log('🔍 Listing all images..');

  const query = `
    SELECT p.ID, p.post_title, pm.meta_value
    FROM M3hSHDUe_posts p
    JOIN M3hSHDUe_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'attachment'
      AND pm.meta_key = '_wp_attachment_metadata'
  `;

  const stream = streamPool.query(query).stream();

  let imageCount = 0;
  let sizeCount = 0;

  stream.on('data', (row: Row) => {
    imageCount++;

    try {
      const metadata = parseMetadata(row.meta_value);
      sizeCount += Object.keys(metadata.sizes ?? {}).length;

      logImage(row.post_title, metadata);
    } catch (e) {
      console.error(`❌ Failed to parse metadata for ID ${row.ID}`, e);
    }
  });

  stream.on('end', () => {
    console.log(`✅ Finished streaming ${imageCount} images and ${sizeCount} sizes.`);
  });

  stream.on('error', (err: Error) => {
    console.error('❌ Error during streaming:', err);
  });
}

// ---------- Helpers ----------
function parseMetadata(metaValue: string): Metadata {
  const raw = unserialize(metaValue) as Record<string, any>;

  return {
    file: raw.file,
    sizes: raw.sizes ?? {},
  };
}

function logImage(title: string, metadata: Metadata): void {
  console.log(`📸: ${title}`);
  console.log(`  ▶ Original: ${metadata.file}`);

  Object.entries(metadata.sizes ?? {}).forEach(([size, data]: [string, SizeData]) => {
    console.log(`  - ${size}: ${data.file} (${data.width}x${data.height})`);
  });
}
