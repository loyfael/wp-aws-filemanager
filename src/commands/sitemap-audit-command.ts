import axios from 'axios';
import * as xml2js from 'xml2js';
import { load } from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sitemapUrl = process.env.SITEMAP_URL!;
const awsBase = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
const logFilePath = path.resolve('sitemap-audit-report.txt');

type ImageResult = {
  pageUrl: string;
  imageUrl: string;
  status: number | 'MISSING';
  isAws: boolean;
};

function appendLog(line: string) {
  fs.appendFileSync(logFilePath, line + '\n');
}

async function fetchSitemapUrls(): Promise<string[]> {
  try {
    console.log(`\n📡 Fetching sitemap from ${sitemapUrl}...`);
    const res = await axios.get(sitemapUrl);
    const parsed = await xml2js.parseStringPromise(res.data);
    const urls: string[] = [];

    if (parsed.sitemapindex?.sitemap) {
      const sitemapEntries = parsed.sitemapindex.sitemap;
      console.log(`📁 Index sitemap with ${sitemapEntries.length} children`);
      for (const [i, sitemap] of sitemapEntries.entries()) {
        const loc = sitemap.loc?.[0];
        if (!loc) continue;
        try {
          console.log(`📄 Parsing child sitemap ${i + 1}/${sitemapEntries.length} : ${loc}`);
          const child = await axios.get(loc);
          const childParsed = await xml2js.parseStringPromise(child.data);
          const urlsFound = childParsed.urlset?.url
            ?.map((u: any) => u.loc?.[0])
            .filter((u: string | undefined): u is string => typeof u === 'string');
          if (urlsFound?.length) {
            console.log(`    ✅ Found ${urlsFound.length} URLs in ${loc}`);
            urls.push(...urlsFound);
          }
        } catch {
          const msg = `⚠️ Could not parse child sitemap: ${loc}`;
          console.warn(msg);
          appendLog(msg);
        }
      }
    } else if (parsed.urlset?.url) {
      const direct = parsed.urlset.url
        .map((u: any) => u.loc?.[0])
        .filter((u: string | undefined): u is string => typeof u === 'string');
      urls.push(...direct);
    }

    return urls;
  } catch (err) {
    const msg = `❌ Failed to fetch sitemap: ${(err as Error).message}`;
    console.error(msg);
    appendLog(msg);
    return [];
  }
}

async function extractAllImageUrls(url: string): Promise<ImageResult[]> {
  try {
    console.log(`🌐 Fetching page ${url}`);
    const res = await axios.get(url, { timeout: 30000 }); // 30 seconds timeout
    
    const $ = load(res.data);
    const images: Set<string> = new Set();

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const abs = src.startsWith('http') ? src : new URL(src, url).href;
        images.add(abs);
      }
    });

    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const matches = [...style.matchAll(/url\((['"]?)(.*?)\1\)/g)];
      for (const match of matches) {
        const src = match[2];
        if (src) {
          const abs = src.startsWith('http') ? src : new URL(src, url).href;
          images.add(abs);
        }
      }
    });

    $('style').each((_, el) => {
      const styleContent = $(el).html() || '';
      const matches = [...styleContent.matchAll(/url\((['"]?)(.*?)\1\)/g)];
      for (const match of matches) {
        const src = match[2];
        if (src) {
          const abs = src.startsWith('http') ? src : new URL(src, url).href;
          images.add(abs);
        }
      }
    });

    console.log(`    🖼️ Found ${images.size} image(s) in ${url}`);

    return [...images].map(imageUrl => ({
      pageUrl: url,
      imageUrl,
      status: 'MISSING',
      isAws: imageUrl.startsWith(awsBase),
    }));
  } catch (err) {
    const msg = `❌ Failed to fetch page: ${url}`;
    console.warn(msg);
    appendLog(msg);
    return [];
  }
}

async function checkImageStatus(img: ImageResult): Promise<ImageResult> {
  try {
    const res = await axios.head(img.imageUrl, {
      timeout: 20000,
      maxRedirects: 0,
      validateStatus: () => true,
    });
    return { ...img, status: res.status };
  } catch {
    return { ...img, status: 404 };
  }
}

export async function sitemapAuditCommand() {
  console.time('⏱️ Execution time');
  fs.writeFileSync(logFilePath, '');

  const PQueue = (await import('p-queue')).default;

  if (!sitemapUrl) {
    const msg = '❌ SITEMAP_URL is not defined.';
    console.error(msg);
    appendLog(msg);
    return;
  }

  console.log('🧭 Starting sitemap audit...');
  const pages = await fetchSitemapUrls();
  console.log(`🔎 Found ${pages.length} pages`);

  let allImages: ImageResult[] = [];
  const failedPages: string[] = [];

  for (const [i, page] of pages.entries()) {
    console.log(`📃 Processing page ${i + 1}/${pages.length}: ${page}`);
    const images = await extractAllImageUrls(page);
    if (images.length === 0) failedPages.push(page);
    allImages.push(...images);

    if ((i + 1) % 25 === 0 || i + 1 === pages.length) {
      console.log(`  📄 ${i + 1}/${pages.length} pages processed — ${allImages.length} image refs`);
    }
  }

  console.log(`\n🔍 Starting HTTP checks on ${allImages.length} images...`);

  const queue = new PQueue({ concurrency: 50 });
  const results: ImageResult[] = [];
  let processed = 0;

  for (const img of allImages) {
    queue.add(async () => {
      const checked = await checkImageStatus(img);
      results.push(checked);
      processed++;
      if (processed % 100 === 0 || processed === allImages.length) {
        console.log(`    ✅ ${processed}/${allImages.length} images checked`);
      }
    });
  }

  await queue.onIdle();

  const broken = results.filter(img => img.status === 404);
  const awsImages = results.filter(img => img.isAws);
  const externalImages = results.filter(img => !img.isAws);

  if (broken.length > 0) {
    console.log('\n❌ Broken or missing images:');
    for (const img of broken) {
      const msg = `• ${img.imageUrl} (from ${img.pageUrl}) → Status: ${img.status} | AWS: ${img.isAws ? '✅' : '❌'}`;
      console.log(msg);
      appendLog(msg);
    }
  }

  console.log('\n📦 Audit complete. Generating report...\n');

  const summary = [
    '',
    '📋 ======= SUMMARY =======',
    `Total pages scanned     : ${pages.length}`,
    `Pages failed to load    : ${failedPages.length}`,
    `Total images found      : ${results.length}`,
    `Images on AWS           : ${awsImages.length}`,
    `Images not on AWS       : ${externalImages.length}`,
    `Broken images (404)     : ${broken.length}`,
    '==========================',
    '',
  ];

  summary.forEach(line => appendLog(line));
  summary.forEach(line => console.log(line));

  console.timeEnd('⏱️ Execution time');
}