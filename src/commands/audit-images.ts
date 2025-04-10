import { streamPool } from '../database/mysql-stream'
import { parseMetadata } from '../utils/metadata-parser'
import fs from 'fs'
import path from 'path'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import readline from 'readline'
import dotenv from 'dotenv'
import { appendToLog } from '../utils/logger'

dotenv.config()

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * CLI prompt for user confirmation
 */
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => rl.question(query, ans => {
    rl.close()
    resolve(ans)
  }))
}

/**
 * Check if a file exists in the local filesystem (/wp-content/uploads/)
 */
function fileExistsLocally(filePath: string): boolean {
  const uploadsRoot = process.env.LOCAL_UPLOADS_PATH

  if (!uploadsRoot) {
    throw new Error('❌ LOCAL_UPLOADS_PATH is not defined in your .env file.')
  }

  const fullPath = path.join(uploadsRoot, 'wp-content', 'uploads', filePath)
  return fs.existsSync(fullPath)
}

/**
 * Check if the file exists on AWS S3
 */
async function fileExistsOnS3(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    }))
    return true
  } catch {
    return false
  }
}

/**
 * Analyse metadata of each image to determine its sync state
 */
export async function auditImagesCommand() {
  const uploadsRoot = process.env.LOCAL_UPLOADS_PATH
  console.log(`Your uploads path is: ${uploadsRoot}`)

  if (!uploadsRoot) {
    const msg = '❌ Error: LOCAL_UPLOADS_PATH is not defined in your .env file.'
    console.error(msg)
    appendToLog(msg)
    process.exit(1)
  }

  const uploadsDir = path.join(uploadsRoot, 'wp-content', 'uploads')
  if (!fs.existsSync(uploadsDir) || !fs.statSync(uploadsDir).isDirectory()) {
    const msg = `❌ Error: The path "${uploadsDir}" does not exist or is not a directory.`
    console.error(msg)
    appendToLog(msg)
    appendToLog(`👉 Check that LOCAL_UPLOADS_PATH is correctly pointing to the root of your WordPress site.`)
    process.exit(1)
  }

  const toDeleteLocally: string[] = []

  const query = `
    SELECT p.ID, m.meta_value
    FROM M3hSHDUe_posts p
    JOIN M3hSHDUe_postmeta m ON p.ID = m.post_id
    WHERE p.post_type = 'attachment' AND m.meta_key = '_wp_attachment_metadata'
    ORDER BY p.ID
  `

  const stream = streamPool.query(query).stream()

  for await (const row of stream) {
    const postId = row.ID
    let metadata

    try {
      metadata = parseMetadata(row.meta_value)
    } catch {
      const msg = `⚠️ Could not parse metadata for post ${postId}`
      console.warn(msg)
      appendToLog(msg)
      continue
    }

    if (!metadata?.file || typeof metadata.file !== 'string') {
      const msg = `⚠️ Post ${postId} has no valid 'file' in metadata.`
      console.warn(msg)
      appendToLog(msg)
      continue
    }

    const filesToCheck: { label: string, key: string }[] = []

    // Main image
    if (metadata.s3?.key) {
      filesToCheck.push({ label: 'main', key: metadata.s3.key })
    } else {
      filesToCheck.push({ label: 'main', key: metadata.file })
    }

    // Sizes
    if (metadata.sizes && typeof metadata.sizes === 'object') {
      for (const [sizeName, sizeData] of Object.entries(metadata.sizes)) {
        if (
          sizeData &&
          typeof sizeData === 'object' &&
          'file' in sizeData &&
          typeof sizeData.file === 'string'
        ) {
          const sizeKey = path.posix.join(path.posix.dirname(metadata.file), sizeData.file)
          filesToCheck.push({ label: sizeName, key: sizeKey })
        }
      }
    }


    // Audit all keys (main + sizes)
    for (const { label, key } of filesToCheck) {
      const existsLocally = fileExistsLocally(key)
      const existsOnS3 = await fileExistsOnS3(key)

      console.log(`📦 Post ${postId} - ${label}`)
      console.log(`  ▶ Local: ${existsLocally ? '✅' : '❌'} | S3: ${existsOnS3 ? '✅' : '❌'}`)

      if (!existsLocally) appendToLog(`⚠️ Missing locally: ${key}`)
      if (!existsOnS3) appendToLog(`⚠️ Missing in S3: ${key}`)

      if (existsLocally && existsOnS3) {
        toDeleteLocally.push(key)
      }
    }
  }

  const summary = `
🔍 ℹ️ ${toDeleteLocally.length} files have already been imported to AWS and are no longer needed in WP, so they can be deleted.`
  console.log(summary)
  appendToLog(summary)

  const answer = await askQuestion('❓ Do you want to delete them now? (y/N): ')

  if (answer.toLowerCase() === 'y') {
    for (const key of toDeleteLocally) {
      const fullPath = path.join(uploadsRoot, 'wp-content', 'uploads', key)
      try {
        fs.unlinkSync(fullPath)
        const msg = `🗑️ Deleted: ${key}`
        console.log(msg)
        appendToLog(msg)
      } catch (err) {
        const msg = `❌ Failed to delete ${key}: ${(err as Error).message}`
        console.warn(msg)
        appendToLog(msg)
      }
    }
  } else {
    console.log('❌ No files deleted.')
    appendToLog('❌ No files deleted.')
  }

  console.log('✅ Audit complete.')
  appendToLog('✅ Audit complete.')
}
