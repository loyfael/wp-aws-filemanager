import fs from 'fs'
import path from 'path'

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'migration-audit.log')

/**
 * Append a message to the log file with a timestamp.
 * Creates the log directory if it doesn't exist.
 */
export function appendToLog(message: string): void {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true })
        }

        const timestamp = new Date().toISOString()
        fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\\n`)
    } catch (err) {
        console.error('⚠️ Failed to write to log file:', (err as Error).message)
    }
}