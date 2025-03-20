import yargs from "yargs/yargs";
import { fetchImages } from "./src/fetch";
import { hideBin } from "yargs/helpers";
import { updateDatabase } from "./src/database";
import { deleteLocalImages } from "./src/cleanup";
import { rollbackChanges } from "./src/rollbackChanges";
import dotenv from "dotenv";
import { uploadImages } from "./src/upload";
dotenv.config();

yargs(hideBin(process.argv))
    .command("fetch", "List images to be migrated", {}, fetchImages)
    .command("upload", "Upload images to S3 and update database", (yargs) => {
        return yargs.option("batchSize", {
            alias: "b",
            type: "number",
            default: 50,
            description: "Number of images to process per batch",
        });
    }, (args) => uploadImages(args.batchSize as number))
    .command("deleteLocalImages", "Delete local images after successful migration", {}, deleteLocalImages)
    .command("rollback", "Revert database changes in case of failure", {}, rollbackChanges)
    .help()
    .parse();