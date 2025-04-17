import dotenv from 'dotenv';
import { streamPool } from '../database/mysql-stream';
import { unserialize } from 'php-serialize';
import { table } from 'table';

dotenv.config();

interface SizeData {
  width: number;
  height: number;
  file: string;
  filesize?: number;
  s3?: {
    url: string;
    key: string;
    bucket: string;
  };
}

interface Metadata {
  file: string;
  sizes?: Record<string, SizeData>;
  s3?: {
    url: string;
    key: string;
    bucket: string;
  };
}

interface Row {
  ID: number;
  post_title: string;
  meta_value: string;
}

type Stat = {
  count: number;
  totalWidth: number;
  totalHeight: number;
  resolutions: Record<string, number>;
  totalSize: number;
};

export async function listCommand(): Promise<void> {
  console.log('🔍 Fetching image data...');

  const query = `
    SELECT p.ID, p.post_title, pm.meta_value
    FROM M3hSHDUe_posts p
    JOIN M3hSHDUe_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'attachment'
      AND pm.meta_key = '_wp_attachment_metadata'
  `;

  const stats: Record<string, Stat> = {};
  let totalImages = 0;
  let awsImages = 0;
  let localImages = 0;

  const stream = streamPool.query(query).stream();

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (row: Row) => {
      try {
        const metadata = parseMetadata(row.meta_value);
        let countForThisPost = 0;

        // Check main image
        if (metadata.file) {
          totalImages++;
          countForThisPost++;
          if (metadata.s3?.key && metadata.s3?.url && metadata.s3?.bucket) {
            awsImages++;
          } else {
            localImages++;
          }
        }

        // Check sizes
        for (const [size, data] of Object.entries(metadata.sizes ?? {})) {
          if (!data?.width || !data?.height) continue;

          totalImages++;
          countForThisPost++;

          stats[size] ??= {
            count: 0,
            totalWidth: 0,
            totalHeight: 0,
            resolutions: {},
            totalSize: 0,
          };

          const stat = stats[size];
          stat.count++;
          stat.totalWidth += data.width;
          stat.totalHeight += data.height;
          stat.totalSize += data.filesize || 0;

          const res = `${data.width}x${data.height}`;
          stat.resolutions[res] = (stat.resolutions[res] || 0) + 1;

          if (data.s3?.key && data.s3?.url && data.s3?.bucket) {
            awsImages++;
          } else {
            localImages++;
          }
        }

        if (countForThisPost === 0) {
          console.warn(`⚠️ No image data found for post ${row.ID}`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to parse metadata for ID ${row.ID}`);
      }
    });

    stream.on('end', () => {
      const output: any[][] = [];
      output.push([
        'Type',
        'Count',
        'Avg Width',
        'Avg Height',
        'Most Common Res',
        'Total Size',
      ]);

      for (const [type, stat] of Object.entries(stats)) {
        const avgWidth = Math.round(stat.totalWidth / stat.count);
        const avgHeight = Math.round(stat.totalHeight / stat.count);
        const mostCommonRes = Object.entries(stat.resolutions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        const formattedSize = formatBytes(stat.totalSize);

        output.push([
          type,
          stat.count,
          avgWidth,
          avgHeight,
          mostCommonRes,
          formattedSize,
        ]);
      }

      console.log(`\n📊 Summary:\n`);
      console.log(table(output));
      console.log(`📦 Total images (main + sizes): ${totalImages}`);
      console.log(`☁️ Images on AWS: ${awsImages}`);
      console.log(`💾 Images only local: ${localImages}`);
      console.log('✅ Done.');
      resolve();
    });

    stream.on('error', (err: Error) => {
      console.error('❌ Error during streaming:', err);
      reject(err);
    });
  });
}

// ----------- Utils -----------
function parseMetadata(metaValue: string): Metadata {
  const raw = unserialize(metaValue) as Record<string, any>;
  return {
    file: raw.file,
    sizes: raw.sizes ?? {},
    s3: raw.s3,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}
