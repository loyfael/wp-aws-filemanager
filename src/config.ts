import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Database Configuration
export const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

// Create a MySQL connection
export async function getDbConnection() {
    return mysql.createConnection(dbConfig);
}

// AWS Configuration
export const AWS_REGION = process.env.AWS_REGION!;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;
export const BUCKET_NAME = process.env.BUCKET_NAME!;
export const UPLOADS_PATH = "/var/www/html/wp-content/uploads";
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
export const BATCH_SIZE = 20;
