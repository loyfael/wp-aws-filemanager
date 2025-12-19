import axios from 'axios';
import * as xml2js from 'xml2js';
import { load } from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sitemapUrl = process.env.SITEMAP_URL!;
const logFilePath = path.resolve('broken-images.txt');

type ImageInfo = {
  pageUrl: string;
  imageUrl: string;
  status: number;
};

function appendLog(line: string) {
  fs.appendFileSync(logFilePath, line + '\n');
}

/**
 * Fetch all URLs from the sitemap (including sitemap indexes)
 */
async function fetchSitemapUrls(): Promise<string[]> {
  try {
    console.log(`\n📡 Récupération du sitemap depuis ${sitemapUrl}...`);
    const res = await axios.get(sitemapUrl);
    const parsed = await xml2js.parseStringPromise(res.data);
    const urls: string[] = [];

    // Check if it's a sitemap index (contains multiple sitemaps)
    if (parsed.sitemapindex?.sitemap) {
      const sitemapEntries = parsed.sitemapindex.sitemap;
      console.log(`📁 Index sitemap avec ${sitemapEntries.length} sous-sitemaps`);
      
      for (const [i, sitemap] of sitemapEntries.entries()) {
        const loc = sitemap.loc?.[0];
        if (!loc) continue;
        
        try {
          console.log(`📄 Analyse du sous-sitemap ${i + 1}/${sitemapEntries.length} : ${loc}`);
          const child = await axios.get(loc);
          const childParsed = await xml2js.parseStringPromise(child.data);
          const urlsFound = childParsed.urlset?.url
            ?.map((u: any) => u.loc?.[0])
            .filter((u: string | undefined): u is string => typeof u === 'string');
          
          if (urlsFound?.length) {
            console.log(`    ✅ ${urlsFound.length} URLs trouvées`);
            urls.push(...urlsFound);
          }
        } catch (err) {
          console.warn(`⚠️ Impossible de parser le sitemap: ${loc}`);
        }
      }
    } 
    // Direct sitemap (single file with URLs)
    else if (parsed.urlset?.url) {
      const direct = parsed.urlset.url
        .map((u: any) => u.loc?.[0])
        .filter((u: string | undefined): u is string => typeof u === 'string');
      urls.push(...direct);
    }

    return urls;
  } catch (err) {
    console.error(`❌ Erreur lors de la récupération du sitemap: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Extract all image URLs from a given page (img tags + CSS background images)
 */
async function extractAllImageUrls(url: string): Promise<string[]> {
  try {
    const res = await axios.get(url, { timeout: 15000 }); // Reduced timeout
    
    const $ = load(res.data);
    const images: Set<string> = new Set();

    // Extract from <img> tags
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const abs = src.startsWith('http') ? src : new URL(src, url).href;
        images.add(abs);
      }
    });

    // Extract from srcset attributes
    $('img[srcset]').each((_, el) => {
      const srcset = $(el).attr('srcset') || '';
      const urls = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
      urls.forEach(src => {
        if (src) {
          const abs = src.startsWith('http') ? src : new URL(src, url).href;
          images.add(abs);
        }
      });
    });

    // Extract from inline styles (background-image)
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

    // Extract from <style> tags
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

    return [...images];
  } catch (err) {
    return [];
  }
}

/**
 * Check if an image URL returns a 404 or 200
 */
async function checkImageStatus(imageUrl: string): Promise<number> {
  try {
    const res = await axios.head(imageUrl, {
      timeout: 10000, // Reduced timeout
      maxRedirects: 3,
      validateStatus: () => true, // Don't throw on 404
    });
    return res.status;
  } catch (err) {
    // Network error or timeout = consider it as broken
    return 404;
  }
}

/**
 * Main command to audit broken images from sitemap
 */
export async function brokenImagesCommand() {
  console.time('⏱️ Temps d\'exécution');
  
  // Clear the output file
  fs.writeFileSync(logFilePath, '');
  appendLog('='.repeat(80));
  appendLog('AUDIT DES IMAGES CASSÉES');
  appendLog(`Date: ${new Date().toLocaleString('fr-FR')}`);
  appendLog('='.repeat(80));
  appendLog('');

  const PQueue = (await import('p-queue')).default;

  if (!sitemapUrl) {
    console.error('❌ SITEMAP_URL n\'est pas définie dans .env');
    return;
  }

  console.log('🧭 Démarrage de l\'audit des images cassées...');
  
  // Step 1: Fetch all page URLs from sitemap
  const pages = await fetchSitemapUrls();
  console.log(`\n🔎 ${pages.length} page(s) trouvée(s) dans le sitemap\n`);

  if (pages.length === 0) {
    console.error('❌ Aucune page trouvée dans le sitemap');
    return;
  }

  // Step 2: Extract all images from all pages (in parallel batches)
  const allImages = new Map<string, string[]>(); // imageUrl -> [pageUrls]
  const pageQueue = new PQueue({ concurrency: 10 }); // Process 10 pages at once
  let pagesProcessed = 0;
  
  for (const page of pages) {
    pageQueue.add(async () => {
      const images = await extractAllImageUrls(page);
      
      images.forEach(imgUrl => {
        if (!allImages.has(imgUrl)) {
          allImages.set(imgUrl, []);
        }
        allImages.get(imgUrl)!.push(page);
      });

      pagesProcessed++;
      if (pagesProcessed % 10 === 0 || pagesProcessed === pages.length) {
        console.log(`  📊 ${pagesProcessed}/${pages.length} pages analysées — ${allImages.size} images uniques trouvées`);
      }
    });
  }

  await pageQueue.onIdle();

  console.log(`\n🔍 Vérification du statut de ${allImages.size} images uniques...\n`);

  // Step 3: Check status of each unique image
  const queue = new PQueue({ concurrency: 100 }); // Increased from 50 to 100
  const brokenImages: ImageInfo[] = [];
  let processed = 0;

  const imageUrls = [...allImages.keys()];

  for (const imgUrl of imageUrls) {
    queue.add(async () => {
      const status = await checkImageStatus(imgUrl);
      processed++;
      
      // Only keep broken images (404 or other errors)
      if (status === 404 || status >= 400) {
        const pages = allImages.get(imgUrl)!;
        brokenImages.push({
          imageUrl: imgUrl,
          pageUrl: pages[0], // Use first page where it appears
          status,
        });
      }

      if (processed % 50 === 0 || processed === imageUrls.length) {
        console.log(`    ✅ ${processed}/${imageUrls.length} images vérifiées`);
      }
    });
  }

  await queue.onIdle();

  // Step 4: Write broken images to file
  console.log(`\n📝 Génération du rapport...\n`);

  if (brokenImages.length > 0) {
    appendLog(`IMAGES CASSÉES (${brokenImages.length} trouvée(s)):`);
    appendLog('');
    
    brokenImages.forEach(img => {
      const pages = allImages.get(img.imageUrl)!;
      appendLog(`URL: ${img.imageUrl}`);
      appendLog(`Status: ${img.status}`);
      appendLog(`Trouvée sur ${pages.length} page(s):`);
      pages.forEach(page => appendLog(`  - ${page}`));
      appendLog('');
    });

    console.log(`❌ ${brokenImages.length} image(s) cassée(s) détectée(s)`);
    console.log(`\n📄 Rapport sauvegardé dans: ${logFilePath}`);
  } else {
    appendLog('✅ Aucune image cassée détectée !');
    console.log('✅ Aucune image cassée détectée !');
  }

  // Summary
  const summary = [
    '',
    '='.repeat(80),
    'RÉSUMÉ',
    '='.repeat(80),
    `Pages analysées        : ${pages.length}`,
    `Images uniques trouvées: ${allImages.size}`,
    `Images cassées (404)   : ${brokenImages.length}`,
    '='.repeat(80),
  ];

  summary.forEach(line => {
    appendLog(line);
    console.log(line);
  });

  console.timeEnd('⏱️ Temps d\'exécution');
}
