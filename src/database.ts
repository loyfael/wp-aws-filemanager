import mysql from "mysql2/promise";

export async function updateDatabase(id: number, newUrl: string) {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });

        await connection.execute("UPDATE M3hSHDUe_posts SET guid = ? WHERE ID = ?", [newUrl, id]);
        await connection.end();
    } catch (error) {
        console.error(`Failed to update database for image ID ${id}:`, error);
    }
}
