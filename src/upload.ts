// upload.ts - Upload images to S3
import AWS from "aws-sdk";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { updateDatabase } from "./database";
import mysql from "mysql2/promise";

dotenv.config();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const ROLLBACK_FILE = path.join(__dirname, "rollback.json");
const DELETE_LOCAL = process.env.DELETE_LOCAL_IMAGES === "true";
const LOCAL_IMAGE_PATH = process.env.LOCAL_IMAGE_PATH || "/var/www/html/wp-content/uploads";

export async function uploadImages(batchSize: number = 50) {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });

        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const [images]: any = await connection.execute(
                "SELECT ID, guid FROM M3hSHDUe_posts WHERE post_type = 'attachment' LIMIT ? OFFSET ?",
                [batchSize, offset]
            );

            if (images.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`Uploading batch of ${images.length} images...`);

            // Charger les données de rollback existantes
            let rollbackData = [];
            if (fs.existsSync(ROLLBACK_FILE)) {
                rollbackData = JSON.parse(fs.readFileSync(ROLLBACK_FILE, "utf-8"));
            }

            await Promise.all(
                images.map(async (image: any) => {
                    try {
                        const imageUrl = image.guid;
                        const imageName = path.basename(imageUrl);
                        const key = `${process.env.AWS_BUCKET_PATH}/${imageName}`;

                        console.log(`Fetching image: ${imageUrl}`);

                        // Télécharger l'image
                        const response = await axios({ url: imageUrl, responseType: "arraybuffer" });

                        // Envoyer sur S3
                        await s3.upload({
                            Bucket: process.env.AWS_BUCKET_NAME || (() => { throw new Error("AWS_BUCKET_NAME is not defined in environment variables"); })(),
                            Key: key,
                            Body: response.data,
                            ContentType: "image/jpeg",
                        }).promise();

                        // Stocker l'ancienne URL dans le fichier rollback.json
                        rollbackData.push({ id: image.ID, oldUrl: imageUrl });

                        // Mettre à jour la BDD avec le nouveau lien AWS
                        const newUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
                        await updateDatabase(image.ID, newUrl);

                        console.log(`✅ Uploaded: ${imageUrl} → ${newUrl}`);

                        // Supprimer l'image locale si activé
                        if (DELETE_LOCAL) {
                            const localFilePath = path.join(LOCAL_IMAGE_PATH, imageName);
                            if (fs.existsSync(localFilePath)) {
                                fs.unlink(localFilePath, (err) => {
                                    if (err) console.error(`Failed to delete ${localFilePath}:`, err);
                                    else console.log(`Deleted local image: ${localFilePath}`);
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Failed to upload: ${image.guid}`, error);
                    }
                })
            );

            // Sauvegarder les rollback data après chaque batch
            fs.writeFileSync(ROLLBACK_FILE, JSON.stringify(rollbackData, null, 2));

            offset += batchSize;
        }

        await connection.end();
        console.log("🎉 All images uploaded successfully!");
    } catch (error) {
        console.error("❌ Error uploading images:", error);
    }
}
