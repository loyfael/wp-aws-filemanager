import readline from "readline";
import { startListImages } from "./src/commands/listImages";
import { startUploadImages } from "./src/commands/uploadImages";
import { startUpdateDb } from "./src/commands/updateDb";
import { startDeleteImages } from "./src/commands/deleteImages";
import { startFullMigration } from "./src/commands/fullMigration";

// Create an interface to capture user input from the console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to display the CLI menu
function showMenu() {
    console.log("\n==============================");
    console.log("1. List all images to migrate");
    console.log("2. Upload images to AWS S3");
    console.log("3. Update database with new image URLs");
    console.log("4. Delete local image files");
    console.log("5. Run full migration process (Upload + DB Update + Delete)");
    console.log("6. Exit");
    console.log("==============================");

    rl.question("Choose an option (1-6): ", async (choice) => {
        switch (choice.trim()) {
            case "1":
                await startListImages();
                break;
            case "2":
                await startUploadImages();
                break;
            case "3":
                await startUpdateDb();
                break;
            case "4":
                await startDeleteImages();
                break;
            case "5":
                await startFullMigration();
                break;
            case "6":
                console.log("Exiting...");
                rl.close();
                return;
            default:
                console.log("Invalid option, please try again.");
        }
        // Show the menu again after the action is completed
        showMenu();
    });
}

// Start the CLI menu
showMenu();
