import { getDbConnection, BATCH_SIZE } from "../config";
import { getImagesFromDatabase, updateDatabase } from "../databaseUtils";
import { uploadFilesToS3 } from "../imageUtils";
import * as path from "path";

export async function startUploadImages() {
    const connection = await getDbConnection();
    const images: { ID: number; guid: string }[] = await getImagesFromDatabase(connection);
    console.log(`Upload de ${images.length} images vers AWS en cours...`);

    for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (image) => {
            const imagePath = path.join("/var/www/html/wp-content/uploads", new URL(image.guid).pathname);
            const newUrl = await uploadFilesToS3(imagePath);
            if (newUrl) {
                await updateDatabase(image.ID, newUrl, connection);
            }
        }));
    }

    console.log("Upload terminé.");
    connection.end();
}
