import fs from 'fs'
import path from 'path'

/**
 * Backup metadata to a JSON file in the backups directory
 * @param postId 
 * @param rawMeta 
 */
export function backupMetadata(postId: number, rawMeta: string) {
  try {
    const backupPath = path.join('backups', `${postId}.json`)
    fs.mkdirSync('backups', { recursive: true })
    fs.writeFileSync(backupPath, JSON.stringify({ postId, rawMeta }, null, 2))
  } catch (error) {
    console.error(`❌ Failed to backup metadata for post ${postId}: ${(error as Error).message}`)
  }
}

/**
 * Restore metadata from a JSON file in the backups directory
 * @param postId 
 * @returns 
 */
export function restoreMetadata(postId: number): string {

  try {
    const backupPath = path.join('backups', `${postId}.json`)
    const content = fs.readFileSync(backupPath, 'utf-8')
    const json = JSON.parse(content)
    return json.rawMeta
  } catch (error) {
    console.error(`❌ Failed to restore metadata for post ${postId}: ${(error as Error).message}`)
    return ''
  }
}
