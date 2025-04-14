import axios from 'axios'
import { parseStringPromise } from 'xml2js'
import { appendToLog } from '../utils/logger'

/**
 * Download and parse sitemap XML
 */
async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await axios.get(sitemapUrl)
    const parsed = await parseStringPromise(response.data)

    const urls = parsed.urlset.url.map((entry: any) => entry.loc[0])
    return urls
  } catch (error) {
    const msg = `❌ Failed to fetch or parse sitemap: ${(error as Error).message}`
    console.error(msg)
    appendToLog(msg)
    return []
  }
}

/**
 * Extract image URLs from HTML of a given page
 */
async function extractImageUrls(pageUrl: string): Promise<string[]> {
  try {
    const response = await axios.get(pageUrl)
    const matches = response.data.match(/<img[^>]+src="([^">]+)"/g) || []
    const urls = matches.map((tag: string) => {
      const match = tag.match(/src="([^">]+)"/)
      return match ? match[1] : null
    }).filter(Boolean) as string[]
    return urls
  } catch (error) {
    const msg = `❌ Failed to load page ${pageUrl}: ${(error as Error).message}`
    console.warn(msg)
    appendToLog(msg)
    return []
  }
}

/**
 * Validate image URLs:
 * - Must return 200
 * - Must start with your AWS S3 base URL
 */
async function validateImageUrl(imageUrl: string, awsBaseUrl: string): Promise<void> {
  if (!imageUrl.startsWith(awsBaseUrl)) {
    const msg = `⚠️ Image is not served from AWS: ${imageUrl}`
    console.warn(msg)
    appendToLog(msg)
    return
  }

  try {
    const res = await axios.head(imageUrl)
    if (res.status !== 200) {
      const msg = `❌ Image not accessible (status ${res.status}): ${imageUrl}`
      console.warn(msg)
      appendToLog(msg)
    }
  } catch (err) {
    const msg = `❌ Image check failed: ${imageUrl} - ${(err as Error).message}`
    console.warn(msg)
    appendToLog(msg)
  }
}

/**
 * Main command to audit all image URLs across the site
 */
export async function auditSiteImagesCommand() {
  const sitemapUrl = process.env.SITEMAP_URL
  const awsBaseUrl = process.env.AWS_PUBLIC_URL_PREFIX

  if (!sitemapUrl || !awsBaseUrl) {
    console.error('❌ SITEMAP_URL or AWS_PUBLIC_URL_PREFIX not defined in .env')
    return
  }

  const pageUrls = await fetchSitemapUrls(sitemapUrl)
  console.log(`🔍 Found ${pageUrls.length} URLs to audit.`)

  for (const pageUrl of pageUrls) {
    console.log(`🌐 Auditing page: ${pageUrl}`)
    const images = await extractImageUrls(pageUrl)
    for (const img of images) {
      await validateImageUrl(img, awsBaseUrl)
    }
  }

  console.log('✅ Site-wide image audit complete.')
}
