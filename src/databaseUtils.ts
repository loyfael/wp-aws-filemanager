import mysql from "mysql2/promise";
import { BUCKET_NAME } from "./config";

/**
 * Update the WordPress database with the new image path
 * @param imagePath - Local image path
 * @param newUrl - S3 URL of the image
 * @param connection - MySQL connection object
 * @returns True if updated successfully, otherwise false
 */
export async function getImagesFromDatabase(connection: mysql.Connection) {
    const [rows]: any = await connection.execute(
        `SELECT ID, guid FROM M3hSHDUe_posts WHERE post_type = 'attachment'`
    );

    return rows;
}

export async function updateDatabase(imageId: number, newUrl: string, connection: mysql.Connection) {
    try {
        await connection.execute(
            `UPDATE M3hSHDUe_posts SET guid = ? WHERE ID = ?`,
            [newUrl, imageId]
        );
    } catch (error) {
        console.error(`Failed to update database for image ID ${imageId}:`, error);
        return false;
    }
}