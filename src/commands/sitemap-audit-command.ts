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

/**
 * Fetch and parse the sitemap.xml
 */
async function fetchSitemapUrls(): Promise<string[]> {
  try {

    const res = await axios.get(sitemapUrl);
    const parsed = await xml2js.parseStringPromise(res.data);

    // Vérification de la structure attendue
    if (!parsed?.urlset?.url || !Array.isArray(parsed.urlset.url)) {
      console.error('❌ The sitemap format is invalid or empty.');
      return [];
    }

    // Extraction des URL des balises <loc>
    return parsed.urlset.url
      .map((entry: any) => entry?.loc?.[0])
      .filter((loc: string | undefined): loc is string => typeof loc === 'string');
  } catch (err) {
    console.error('❌ Failed to fetch or parse sitemap:', (err as Error).message);
    return [];
  }
}


/**
 * Extract image URLs from a given page
 */
async function extractImagesFromPage(url: string): Promise<ImageResult[]> {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const images: ImageResult[] = [];

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;

      images.push({
        pageUrl: url,
        imageUrl: src,
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

/**
 * Check status of all images
 */
async function checkImages(images: ImageResult[]): Promise<ImageResult[]> {
  const results: ImageResult[] = [];

  for (const image of images) {
    try {
      const res = await axios.head(image.imageUrl);
      results.push({ ...image, status: res.status });
    } catch (err: any) {
      results.push({ ...image, status: 404 });
    }
  }

  return results;
}

/**
 * Main command
 */
export async function sitemapAuditCommand() {
  console.log('🧭 Fetching sitemap...');

  if (!sitemapUrl) {
    console.error('❌ SITEMAP_URL is not defined in your .env file.');
    return;
  }

  const pages = await fetchSitemapUrls();

  console.log(`🔎 Found ${pages.length} pages. Scanning for images...`);
  let allImages: ImageResult[] = [];

  for (const page of pages) {
    const images = await extractImagesFromPage(page);
    allImages.push(...images);
  }

  console.log(`🖼️ Found ${allImages.length} images. Verifying...`);

  const results = await checkImages(allImages);

  const errors = results.filter(img => img.status === 404 || !img.isAws);

  console.log(`\n📊 Report:`);
  console.log(`- Total images scanned: ${results.length}`);
  console.log(`- Images with 404: ${errors.filter(e => e.status === 404).length}`);
  console.log(`- Images not hosted on AWS: ${errors.filter(e => !e.isAws).length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Problematic images:`);

    for (const err of errors) {
      console.log(`• ${err.imageUrl} (from ${err.pageUrl}) → Status: ${err.status} | AWS: ${err.isAws ? '✅' : '❌'}`);
    }
  } else {
    console.log('✅ No issues found.');
  }

  console.log('\n✅ Sitemap audit complete.');
}
