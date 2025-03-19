import { getDbConnection } from "../config";
import { getImagesFromDatabase } from "../databaseUtils";

export async function startListImages() {
    const connection = await getDbConnection();
    const images = await getImagesFromDatabase(connection);
    
    console.log(`📸 ${images.length} images trouvées :`);
    images.forEach((img: { ID: number; guid: string }) => console.log(` - ID: ${img.ID} | URL: ${img.guid}`));

    connection.end();
}