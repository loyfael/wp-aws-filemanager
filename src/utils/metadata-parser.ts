import { unserialize, serialize } from 'php-serialize'

/**
 * Parse metadata string to object
 * @param meta 
 * @returns 
 */
export function parseMetadata(meta: string): any {
  try {
    return unserialize(meta)
  } catch (error) {
    console.error(`❌ Failed to parse metadata: ${(error as Error).message}`)
    return {}
  }
  
}

/**
 * Serialize metadata object to string
 * @param meta 
 * @returns 
 */
export function serializeMetadata(meta: any): string {
  try {
    return serialize(meta)
  } catch (error) {
    console.error(`❌ Failed to serialize metadata: ${(error as Error).message}`)
    return ''
  }
}
