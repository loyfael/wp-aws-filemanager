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

// Append only the final summary
function appendLog(lines: string[]) {
  fs.writeFileSync(logFilePath, lines.join('\n') + '\n');
}

async function fetchSitemapUrls(): Promise<string[]> {
  try {
    const res = await axios.get(sitemapUrl);
    const parsed = await xml2js.parseStringPromise(res.data);
    const urls: string[] = [];

    if (parsed.sitemapindex?.sitemap) {
      const sitemapEntries = parsed.sitemapindex.sitemap;
      console.log(`📁 Index sitemap with ${sitemapEntries.length} children`);
      for (const [i, sitemap] of sitemapEntries.entries()) {
        const loc = sitemap.loc?.[0];
        if (!loc) continue;
        console.log(`  ↪️ ${i + 1}/${sitemapEntries.length}: ${loc}`);
        try {
          const child = await axios.get(loc);
          const childParsed = await xml2js.parseStringPromise(child.data);
          const urlsFound = childParsed.urlset?.url
            ?.map((u: any) => u.loc?.[0])
            .filter((u: string | undefined): u is string => typeof u === 'string');
          if (urlsFound?.length) {
            urls.push(...urlsFound);
            console.log(`    ✅ ${urlsFound.length} pages`);
          }
        } catch {
          console.warn(`    ⚠️ Could not parse child sitemap: ${loc}`);
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
    console.error('❌ Failed to fetch main sitemap:', (err as Error).message);
    return [];
  }
}

async function extractImagesFromPage(url: string): Promise<ImageResult[]> {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const $ = load(res.data);
    return $('img')
      .map((_, el) => {
        const src = $(el).attr('src');
        if (!src) return null;
        const abs = src.startsWith('http') ? src : new URL(src, url).href;
        return {
          pageUrl: url,
          imageUrl: abs,
          status: 'MISSING',
          isAws: abs.startsWith(awsBase),
        };
      })
      .get()
      .filter(Boolean) as ImageResult[];
  } catch {
    console.warn(`❌ Could not fetch: ${url}`);
    return [];
  }
}

async function checkImageStatus(img: ImageResult): Promise<ImageResult> {
  try {
    const res = await axios.head(img.imageUrl, {
      timeout: 5000,
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
  fs.writeFileSync(logFilePath, ''); // On nettoie le fichier au lancement

  const PQueue = (await import('p-queue')).default;

  if (!sitemapUrl) {
    console.error('❌ SITEMAP_URL is not defined.');
    return;
  }

  console.log('🧭 Starting sitemap audit...');
  const pages = await fetchSitemapUrls();
  console.log(`🔎 Found ${pages.length} pages`);

  let allImages: ImageResult[] = [];

  for (const [i, page] of pages.entries()) {
    const images = await extractImagesFromPage(page);
    allImages.push(...images);

    if ((i + 1) % 25 === 0 || i + 1 === pages.length) {
      console.log(`  📄 ${i + 1}/${pages.length} pages processed — ${allImages.length} images`);
    }
  }

  console.log(`🖼️ Total images collected: ${allImages.length}`);

  // Optimisation : ne vérifier que les images AWS
  const toCheck = allImages.filter(img => img.isAws);
  const notAws = allImages.filter(img => !img.isAws);

  const queue = new PQueue({ concurrency: 50 });
  const results: ImageResult[] = [];

  let processed = 0;
  for (const img of toCheck) {
    queue.add(async () => {
      const checked = await checkImageStatus(img);
      results.push(checked);
      processed++;
      if (processed % 200 === 0 || processed === toCheck.length) {
        console.log(`  ⏳ Checked ${processed}/${toCheck.length} AWS images...`);
      }
    });
  }

  await queue.onIdle();

  const broken = results.filter(img => img.status === 404);

  // Écriture uniquement des logs détaillés
  const lines: string[] = [];

  if (broken.length > 0 || notAws.length > 0) {
    console.log('\n❌ Problematic images:');
    for (const img of [...broken, ...notAws]) {
      const msg = `• ${img.imageUrl} (from ${img.pageUrl}) → Status: ${img.status} | AWS: ${img.isAws ? '✅' : '❌'}`;
      console.log(msg);
      lines.push(msg);
    }

    fs.writeFileSync(logFilePath, lines.join('\n') + '\n');
  } else {
    const msg = '✅ All images valid and correctly hosted on AWS.';
    console.log(msg);
    fs.writeFileSync(logFilePath, msg + '\n');
  }

  console.timeEnd('⏱️ Execution time');
}
