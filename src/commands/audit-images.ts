import { streamPool } from '../database/mysql-stream'
import { parseMetadata } from '../utils/metadata-parser'
import fs from 'fs'
import path from 'path'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import readline from 'readline'
import dotenv from 'dotenv'

dotenv.config()

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * CLI prompt
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
  const localPath = path.join(process.env.LOCAL_UPLOADS_PATH!, filePath)
  return fs.existsSync(localPath)
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
      console.warn(`⚠️ Could not parse metadata for post ${postId}`)
      continue
    }

    if (!metadata?.s3 || !metadata.file) {
      console.warn(`⚠️ Post ${postId} does not have S3 metadata or file path.`)
      continue
    }

    const key = metadata.s3.key
    const existsLocally = fileExistsLocally(key)
    const existsOnS3 = await fileExistsOnS3(key)

    console.log(`📦 Post ${postId}`)
    console.log(`  ▶ Local: ${existsLocally ? '✅' : '❌'} | S3: ${existsOnS3 ? '✅' : '❌'}`)

    if (existsLocally && existsOnS3) {
      toDeleteLocally.push(key)
    }
  }

  console.log(`
🔍 ℹ️ ${toDeleteLocally.length} files have already been imported to AWS and are no longer needed in WP, so they can be deleted.`)
  const answer = await askQuestion('❓ Do you want to delete them now? (y/N): ')

  if (answer.toLowerCase() === 'y') {
    toDeleteLocally.forEach(file => {
      const fullPath = path.join(process.env.LOCAL_UPLOADS_PATH!, file)
      try {
        fs.unlinkSync(fullPath)

        console.log(`🗑️ Deleted: ${file}`)
      } catch (err) {
        console.warn(`❌ Failed to delete ${file}: ${(err as Error).message}`)
      }
    })
  } else {
    console.log('❌ No files deleted.')
  }

  console.log('✅ Audit complete.')
}
