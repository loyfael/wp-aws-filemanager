import { pool } from '../database/mysql';
import { logInfo } from '../utils/logger'

/**
 * List images from the database
 */
export async function listCommand() {
  const [rows] = await pool.query(
    `SELECT ID, post_title FROM M3hSHDUe_posts WHERE post_type = 'attachment' LIMIT 10`
  )

  logInfo('Images found:')
  console.log(rows)
}
