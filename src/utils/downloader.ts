import fs from 'fs'
import path from 'path'
import axios from 'axios'

/**
 *  Download an image from a URL and save it to a temporary file
 * @param imagePath 
 * @returns 
 */
export async function downloadImage(imagePath: string): Promise<string> {

  console.log(`📥 Downloading image: ${imagePath}`)

  try {
    const url = `${process.env.WP_UPLOADS_URL_PREFIX}${imagePath}`
    const tempFilePath = path.join('/tmp', path.basename(imagePath)) // '/tmp' is a common temp directory in many environments
    const writer = fs.createWriteStream(tempFilePath)
    const response = await axios.get(url, { responseType: 'stream' })

    // Check for 404 status
    if (response.status === 404) {
      console.error(`❌ Error 404: Image not found at ${url}`)
    }
  
    if (!imagePath || typeof imagePath !== 'string') {
      throw new Error(`Invalid image path: ${imagePath}`);
    }

    response.data.pipe(writer)
  
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve())
      writer.on('error', err => reject(err))
    })

    return tempFilePath
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.error(`❌ Failed to download image: 404 Not Found - ${imagePath}. Probably exist in database but not in filesystem.`)
    } else {
      console.error(`❌ Failed to download image: ${(error as Error).message}`)
    }
    throw error
  }
}
