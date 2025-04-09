import fs from 'fs'
import path from 'path'
import axios from 'axios'

/**
 *  Download an image from a URL and save it to a temporary file
 * @param imagePath 
 * @returns 
 */
export async function downloadImage(imagePath: string): Promise<string> {
  try {
    const url = `${process.env.WP_UPLOADS_URL_PREFIX}${imagePath}`
    const tempFilePath = path.join('/tmp', path.basename(imagePath))
    const writer = fs.createWriteStream(tempFilePath)
    const response = await axios.get(url, { responseType: 'stream' })
  
    response.data.pipe(writer)
  
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve())
      writer.on('error', err => reject(err))
    })
    return tempFilePath
  } catch (error) {
    console.error(`❌ Failed to download image: ${(error as Error).message}`)
    throw error
  }
}
