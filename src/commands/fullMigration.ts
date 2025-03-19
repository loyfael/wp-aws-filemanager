import { startDeleteImages } from "./deleteImages";
import { startUpdateDb } from "./updateDb";
import { startUploadImages } from "./uploadImages";

export async function startFullMigration() { 
    console.log("Lancement de la migration totale des images...");

    await startUploadImages();
    await startUpdateDb();
    await startDeleteImages();

    console.log("La migration totale à été effectuée avec succès !");
}