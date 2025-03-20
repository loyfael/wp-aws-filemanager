import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export async function fetchImages() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });
    
    const [rows] = await connection.execute(
        "SELECT ID, guid FROM M3hSHDUe_posts WHERE post_type = 'attachment'"
    );
    
    console.log("Images to be migrated:", rows);
    await connection.end();
}