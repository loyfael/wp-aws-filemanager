import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const ROLLBACK_FILE = path.join(__dirname, "rollback.json");

export async function rollbackChanges() {
    try {
        if (!fs.existsSync(ROLLBACK_FILE)) {
            console.log("No rollback file found. Nothing to revert.");
            return;
        }

        const rollbackData = JSON.parse(fs.readFileSync(ROLLBACK_FILE, "utf-8"));
        if (!rollbackData.length) {
            console.log("Rollback file is empty. Nothing to revert.");
            return;
        }

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });

        for (const record of rollbackData) {
            await connection.execute("UPDATE M3hSHDUe_posts SET guid = ? WHERE ID = ?", [
                record.oldUrl,
                record.id,
            ]);
            console.log(`Rolled back image ID ${record.id} to ${record.oldUrl}`);
        }

        await connection.end();

        fs.unlinkSync(ROLLBACK_FILE);
        console.log("Rollback complete. File removed.");
    } catch (error) {
        console.error("Error rolling back changes:", error);
    }
}
