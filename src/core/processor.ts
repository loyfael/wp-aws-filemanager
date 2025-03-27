import { pool } from '../database/mysql'
import { parseMetadata, serializeMetadata } from '../utils/metadata-parser'
import { downloadImage } from '../utils/downloader'
import { uploadToS3 } from '../aws/uploader'
import { backupMetadata } from '../utils/backup';
import path from 'path'
import fs from 'fs/promises'

interface ProcessImageOptions {
  dryRun?: boolean
}

export async function processImages(batchSize: number, options: ProcessImageOptions = {}) {
  const [attachments]: any[] = await pool.query(
    `SELECT ID FROM M3hSHDUe_posts WHERE post_type = 'attachment' LIMIT ${batchSize}`
  )

  for (const row of attachments) {
    const postId = row.ID

    const [metaRows]: any[] = await pool.query(
      `SELECT meta_value FROM M3hSHDUe_postmeta WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
      [postId]
    )

    if (!metaRows.length) continue

    const rawMeta = metaRows[0].meta_value
    const metadata = parseMetadata(rawMeta)

    // Skip if already migrated
    if (metadata?.s3) {
      console.log(`Skipping post ${postId}, already migrated.`)
      continue
    }

    try {
      const filePath = metadata.file
      const localFile = await downloadImage(filePath)

      const mainUrl = options.dryRun
        ? `DRY_RUN_S3_URL/${filePath}`
        : await uploadToS3(localFile, filePath)

      metadata.s3 = {
        url: mainUrl,
        bucket: process.env.AWS_BUCKET_NAME!,
        key: filePath,
        provider: 's3',
        'mime-type': 'image/jpeg',
        privacy: 'public-read',
      }

      if (!options.dryRun) await fs.unlink(localFile)

      // Handle sizes
      const basePath = path.posix.dirname(filePath)

      if (metadata.sizes && typeof metadata.sizes === 'object') {
        for (const sizeName in metadata.sizes) {
          const size = metadata.sizes[sizeName]

          if (size.s3) {
            console.log(`Skipping size '${sizeName}' for post ${postId} (already migrated).`)
            continue
          }

          try {
            const sizeKey = `${basePath}/${size.file}`
            const sizeTmp = await downloadImage(sizeKey)

            const sizeUrl = options.dryRun
              ? `DRY_RUN_S3_URL/${sizeKey}`
              : await uploadToS3(sizeTmp, sizeKey)

            size.s3 = {
              url: sizeUrl,
              bucket: process.env.AWS_BUCKET_NAME!,
              key: sizeKey,
              provider: 's3',
              'mime-type': size['mime-type'] || 'image/jpeg',
              privacy: 'public-read',
            }

            if (!options.dryRun) await fs.unlink(sizeTmp)
          } catch (err) {
            console.log(`Failed to process size '${sizeName}' for post ${postId}: ${(err as Error).message}`)
          }
        }
      }

      const newMeta = serializeMetadata(metadata)

      if (!options.dryRun) {
        backupMetadata(postId, rawMeta)
        await pool.query(
          `UPDATE M3hSHDUe_postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
          [newMeta, postId]
        )
        
        console.log(`✅ Migrated post ${postId} (main + sizes)`)

      } else {
        console.log(`(Dry-run) Would migrate post ${postId} + sizes`)
      }

    } catch (err) {
      console.log(`❌ Failed to migrate post ${postId}: ${(err as Error).message}`)
    }
  }

  console.log(options.dryRun ? 'Dry-run completed.' : 'Migration completed.')
}
