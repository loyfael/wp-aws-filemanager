import axios from 'axios';
import * as xml2js from 'xml2js';
import { load } from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const sitemapUrl = process.env.SITEMAP_URL!;
const awsBase = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

type ImageResult = {
  pageUrl: string;
  imageUrl: string;
  status: number | 'MISSING';
  isAws: boolean;
};

async function fetchSitemapUrls(): Promise<string[]> {
  try {
    const res = await axios.get(sitemapUrl);
    const parsed = await xml2js.parseStringPromise(res.data);
    const urls: string[] = [];

    if (parsed.sitemapindex?.sitemap) {
      const sitemapEntries = parsed.sitemapindex.sitemap;
      console.log(`📁 Sitemap index found with ${sitemapEntries.length} child sitemaps...`);

      const sitemapPromises = sitemapEntries.map(async (sitemap: any, i: number) => {
        const loc = sitemap.loc?.[0];
        if (!loc) return;

        console.log(`  ↪️ [${i + 1}/${sitemapEntries.length}] Fetching: ${loc}`);
        try {
          const childRes = await axios.get(loc);
          const childParsed = await xml2js.parseStringPromise(childRes.data);

          if (childParsed.urlset?.url) {
            const childUrls = childParsed.urlset.url
              .map((entry: any) => entry?.loc?.[0])
              .filter((loc: string | undefined): loc is string => typeof loc === 'string');
            console.log(`    ✅ Found ${childUrls.length} URLs`);
            urls.push(...childUrls);
          }
        } catch (err) {
          console.warn(`    ⚠️ Failed to parse: ${loc}`);
        }
      });

      await Promise.all(sitemapPromises);
    } else if (parsed.urlset?.url) {
      const directUrls = parsed.urlset.url
        .map((entry: any) => entry?.loc?.[0])
        .filter((loc: string | undefined): loc is string => typeof loc === 'string');
      console.log(`📄 Standard sitemap with ${directUrls.length} URLs`);
      urls.push(...directUrls);
    } else {
      console.error('❌ Sitemap format is invalid or empty.');
    }

    return urls;
  } catch (err) {
    console.error('❌ Failed to fetch main sitemap:', (err as Error).message);
    return [];
  }
}

async function extractImagesFromPage(url: string): Promise<ImageResult[]> {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const $ = load(res.data);
    const images: ImageResult[] = [];

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;

      const absoluteUrl = src.startsWith('http') ? src : new URL(src, url).href;

      images.push({
        pageUrl: url,
        imageUrl: absoluteUrl,
        status: 'MISSING',
        isAws: src.startsWith(awsBase),
      });
    });

    return images;
  } catch (err) {
    console.warn(`❌ Failed to fetch page: ${url}`);
    return [];
  }
}

async function checkImageStatus(image: ImageResult): Promise<ImageResult> {
  try {
    const res = await axios.head(image.imageUrl, { timeout: 8000 });
    return { ...image, status: res.status };
  } catch {
    return { ...image, status: 404 };
  }
}

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency = 10
): Promise<void> {
  const queue = [...items];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    const worker = (async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await fn(item);
      }
    })();
    workers.push(worker);
  }

  await Promise.all(workers);
}

export async function sitemapAuditCommand() {
  console.time('⏱️ Execution time');
  console.log('🧭 Starting sitemap audit...');

  if (!sitemapUrl) {
    console.error('❌ SITEMAP_URL is not defined.');
    return;
  }

  const pages = await fetchSitemapUrls();
  console.log(`🔎 Found ${pages.length} pages.`);

  let allImages: ImageResult[] = [];
  let progress = 0;

  for (const [i, page] of pages.entries()) {
    const images = await extractImagesFromPage(page);
    allImages.push(...images);

    if ((i + 1) % 25 === 0 || i + 1 === pages.length) {
      console.log(`  📄 Processed ${i + 1}/${pages.length} pages... (${allImages.length} images so far)`);
    }
  }

  console.log(`🖼️ Total images found: ${allImages.length}. Verifying status...`);

  const results: ImageResult[] = [];

  await runWithConcurrency(allImages, async (img) => {
    const checked = await checkImageStatus(img);
    results.push(checked);
  }, 25);

  const broken = results.filter(img => img.status === 404);
  const notAws = results.filter(img => !img.isAws);

  console.log('\n📊 Audit Report:');
  console.log(`- Pages scanned: ${pages.length}`);
  console.log(`- Images scanned: ${results.length}`);
  console.log(`- Broken images (404): ${broken.length}`);
  console.log(`- Images not hosted on AWS: ${notAws.length}`);
  console.log(`- Images not hosted on AWS: ${notAws.length}`);

  if (broken.length > 0 || notAws.length > 0) {
    console.log('\n❌ Problematic images:');
    for (const img of [...broken, ...notAws]) {
      console.log(`• ${img.imageUrl} (from ${img.pageUrl}) → Status: ${img.status} | AWS: ${img.isAws ? '✅' : '❌'}`);
    }
  } else {
    console.log('✅ All images are valid and correctly hosted on AWS.');
  }

  console.timeEnd('⏱️ Execution time');
}

