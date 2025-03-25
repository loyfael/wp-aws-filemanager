import { unserialize, serialize } from 'php-serialize'

/**
 * Parse metadata string to object
 * @param meta 
 * @returns 
 */
export function parseMetadata(meta: string): any {
  return unserialize(meta)
}

/**
 * Serialize metadata object to string
 * @param meta 
 * @returns 
 */
export function serializeMetadata(meta: any): string {
  return serialize(meta)
}
