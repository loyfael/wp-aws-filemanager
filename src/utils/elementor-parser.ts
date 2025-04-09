/**
 * Recursively scans an object for any "url" fields pointing to /wp-content/uploads/
 * and replaces them with a new S3 URL based on a provided function.
 */
export function replaceImageUrlsInElementorData(data: any, getS3Url: (originalUrl: string) => string | null): any {

    try {
        /**
     * If the data is an array, recursively call this function on each item.
     */
        if (Array.isArray(data)) {
            // Permit the use of map() here, as we're not modifying the array in place.
            return data.map(item => replaceImageUrlsInElementorData(item, getS3Url))
        }

        /**
         * If the data is an object, recursively call this function on each key.
         */
        if (typeof data === 'object' && data !== null) {

            // Create a new object to store the modified data.
            const newObj: any = {}

            // Iterate over each key in the object.
            for (const key in data) {
                // If the key is "url" and the value is a string containing /wp-content/uploads/,
                if (key === 'url' && typeof data[key] === 'string' && data[key].includes('/wp-content/uploads/')) {
                    // Replace the URL with a new S3 URL.
                    const newUrl = getS3Url(data[key])
                    // Store the new URL in the new object, or the original URL if the replacement failed.
                    newObj[key] = newUrl ?? data[key]
                } else {
                    // Otherwise, recursively call this function on the value.
                    newObj[key] = replaceImageUrlsInElementorData(data[key], getS3Url)
                }
            }
            return newObj
        }

        return data
    } catch (err) {
        console.error('❌ Error while replacing image URLs in Elementor data:', err)
        return data
    }
}
