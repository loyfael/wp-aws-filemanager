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

function fileExistsLocally(filePath: string): boolean {
  const uploadsRoot = process.env.LOCAL_UPLOADS_PATH
  if (!uploadsRoot) throw new Error('❌ LOCAL_UPLOADS_PATH is not defined.')
  const fullPath = path.join(uploadsRoot, 'wp-content', 'uploads', filePath)
  return fs.existsSync(fullPath)
}

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

export async function auditImagesCommand() {
  const uploadsRoot = process.env.LOCAL_UPLOADS_PATH
  console.log(`Your uploads path is: ${uploadsRoot}`)

  if (!uploadsRoot) {
    console.error('❌ LOCAL_UPLOADS_PATH is not defined in your .env file.')
    appendToLog('❌ LOCAL_UPLOADS_PATH is not defined in your .env file.')
    process.exit(1)
  }

  const uploadsDir = path.join(uploadsRoot, 'wp-content', 'uploads')
  if (!fs.existsSync(uploadsDir) || !fs.statSync(uploadsDir).isDirectory()) {
    const msg = `❌ The path "${uploadsDir}" does not exist or is not a directory.`
    console.error(msg)
    appendToLog(msg)
    appendToLog('👉 Check that LOCAL_UPLOADS_PATH points to the root of your WordPress site.')
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

    if (typeof metadata.file !== 'string' || !metadata.file.trim()) {
      const msg = `⚠️ Post ${postId} has invalid or empty 'file' path.`
      console.warn(msg)
      appendToLog(msg)
      continue
    }

    const filesToCheck: { label: string, key: string }[] = []

    if (metadata.s3?.key && typeof metadata.s3.key === 'string') {
      filesToCheck.push({ label: 'main', key: metadata.s3.key })
    } else {
      filesToCheck.push({ label: 'main', key: metadata.file })
    }

    if (metadata.sizes && typeof metadata.sizes === 'object') {
      for (const [sizeName, sizeData] of Object.entries(metadata.sizes)) {
        if (
          sizeData &&
          typeof sizeData === 'object' &&
          sizeData !== null &&
          Object.prototype.hasOwnProperty.call(sizeData, 'file') &&
          typeof (sizeData as { file?: unknown }).file === 'string'
        ) {
          const file = (sizeData as { file: string }).file
          const sizeKey = path.posix.join(path.posix.dirname(metadata.file), file)
          filesToCheck.push({ label: sizeName, key: sizeKey })
        } else {
          const msg = `⚠️ Skipping size "${sizeName}" of post ${postId} due to invalid structure`
          console.warn(msg)
          appendToLog(msg)
        }
      }
    }

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

  const uniqueToDelete = [...new Set(toDeleteLocally)]

  console.log(`\n🔍 ${uniqueToDelete.length} file(s) are on S3 and local disk, and could be deleted.`)

  const answer = await askQuestion('❓ Do you want to delete them now? (y/N): ')

  if (answer.toLowerCase() === 'y') {
    for (const key of uniqueToDelete) {
      const fullPath = path.join(uploadsRoot, 'wp-content', 'uploads', key)
      try {
        fs.unlinkSync(fullPath)
        console.log(`🗑️ Deleted: ${key}`)
      } catch (err) {
        const msg = `❌ Failed to delete ${key}: ${(err as Error).message}`
        console.warn(msg)
        appendToLog(msg)
      }
    }
  } else {
    console.log('❌ No files deleted.')
  }

  console.log('✅ Audit complete.')
}
