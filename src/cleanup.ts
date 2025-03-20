import fs from "fs";
import path from "path";

export async function deleteLocalImages() {
    const imageFolder = process.env.LOCAL_IMAGE_PATH || "/var/www/html/wp-content/uploads";

    try {
        const files = fs.readdirSync(imageFolder);
        files.forEach((file) => {
            const filePath = path.join(imageFolder, file);
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete ${file}:`, err);
                else console.log(`Deleted ${file}`);
            });
        });
    } catch (error) {
        console.error("Error deleting local images:", error);
    }
}
