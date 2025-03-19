import path from "path";
import { getDbConnection } from "../config";
import { getImagesFromDatabase } from "../databaseUtils";
import { deleteLocalImage } from "../imageUtils";

export async function startDeleteImages() {
    try {
        const connection = await getDbConnection();
        const images = await getImagesFromDatabase(connection);

        console.log("🔄 Suppression des images locales en cours...");

        for (const image of images) {
            // ✅ Extraire uniquement le chemin du fichier sans l'URL complète
            const relativePath = new URL(image.guid).pathname.replace("/wp-content/uploads/", "");
            const imagePath = path.join("/var/www/html/wp-content/uploads", relativePath);

            console.log(`🗑️ Suppression : ${imagePath}`); // Vérification

            await deleteLocalImage(imagePath);
        }

        console.log("✅ Suppression terminée.");
        connection.end();
    } catch (error) {
        console.error("❌ Erreur lors de la suppression des images : ", error);
    }
}