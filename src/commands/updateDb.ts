import { getDbConnection } from "../config";
import { getImagesFromDatabase, updateDatabase } from "../databaseUtils";

export async function startUpdateDb() {
    const connection = await getDbConnection();
    const images = await getImagesFromDatabase(connection);

    console.log("Mise à jour de la base de données...");

    for (const image of images) {
        if (image.newUrl) {
            await updateDatabase(image.ID, image.newUrl, connection);
        }
    }

    console.log("Base de données mise à jour !");
    connection.end();
}
