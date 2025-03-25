import { pool } from '../database/mysql'
import { restoreMetadata } from '../utils/backup'
import { logInfo } from '../utils/logger'

/**
 * Rollback metadata for a specific post ID from backup table M3hSHDUe_postmeta
 * @returns 
 */
export async function rollbackCommand() {
  const postId = parseInt(process.argv[3]?.split('=')[1] || '0', 10)
  if (!postId) {
    console.error('Usage: rollback --post-id=123')
    return
  }

  const rawMeta = restoreMetadata(postId)
  await pool.query(
    `UPDATE M3hSHDUe_postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = '_wp_attachment_metadata'`,
    [rawMeta, postId]
  )
  logInfo(`Restored metadata for post ${postId}`)
}
