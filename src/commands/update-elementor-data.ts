import { pool } from '../database/mysql'
import fs from 'fs'
import path from 'path'
import { replaceImageUrlsInElementorData } from '../utils/elementor-parser'
import { WP_TABLE_PREFIX } from '../utils/variable';

const dryRun = process.argv.includes('--dry-run')
const apply = process.argv.includes('--apply')

// Optional: load a JSON map of original URLs → S3 URLs if you prebuilt one
const s3BaseUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`

/**
 * Builds an S3 URL from an original URL.
 * @param originalUrl 
 * @returns 
 */
function buildS3Url(originalUrl: string): string | null {
    try {
        const uploadIndex = originalUrl.indexOf('/wp-content/uploads/')
        if (uploadIndex === -1) return null
        const filePath = originalUrl.substring(uploadIndex + '/wp-content/uploads/'.length)
        return `${s3BaseUrl}${filePath}`
    } catch (e) {
        return null
    }
}

/**
 * Updates all Elementor data in the database with new S3 URLs.
 */
export async function updateElementorDataCommand() {

    // Fetch all Elementor data from the database
    const [rows]: any[] = await pool.query(
        `SELECT post_id, meta_value FROM ${WP_TABLE_PREFIX}_postmeta WHERE meta_key = '_elementor_data'`
    )

    // Iterate over each row
    for (const row of rows) {
        const postId = row.post_id
        const rawMeta = row.meta_value

        let json

        // Attempt to parse the JSON
        try {
            json = JSON.parse(rawMeta)
        } catch (err) {
            console.log(`❌ Invalid JSON for post_id ${postId}`)
            continue
        }

        // Update the JSON with new S3 URLs
        const updatedJson = replaceImageUrlsInElementorData(json, buildS3Url)
        // Serialize the updated JSON
        const updatedMeta = JSON.stringify(updatedJson)

        // Backup original meta
        fs.mkdirSync('./backups', { recursive: true })
        fs.writeFileSync(
            path.join('./backups', `elementor_${postId}.json`),
            JSON.stringify({ postId, original: rawMeta }, null, 2)
        )

        // Log the update action
        if (dryRun) {
            console.log(`(Dry-run) Would update _elementor_data for post ${postId}`)
        }

        // Apply the update if --apply is set
        if (apply) {
            await pool.query(
                `UPDATE ${WP_TABLE_PREFIX}_postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = '_elementor_data'`,
                [updatedMeta, postId]
            )
            console.log(`✅ Updated _elementor_data for post ${postId}`)
        }
    }

    // Log completion message
    console.log(dryRun ? 'Dry-run complete.' : 'Update complete.')
}
