import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const txtFilePath = path.resolve('truc.txt');
const uploadsRoot = process.env.LOCAL_UPLOADS_PATH!;

if (!uploadsRoot) {
    console.error('❌ LOCAL_UPLOADS_PATH is not defined in your .env file.');
    process.exit(1);
}

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

export async function cleanupOrphansCommand() {
    if (!fs.existsSync(txtFilePath)) {
        console.error(`❌ File not found: ${txtFilePath}`);
        process.exit(1);
    }

    const lines = fs.readFileSync(txtFilePath, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) {
        console.error('❌ The file is empty or improperly formatted.');
        return;
    }

    // Trouver la dernière .mp4 pour exclusion
    const lastMp4Url = [...lines].reverse().find(url => url.toLowerCase().endsWith('.mp4'));
    const lastMp4Key = lastMp4Url
        ? new URL(lastMp4Url).pathname.replace(/^\/wp-content\/uploads\//, '')
        : null;

    const toDelete: string[] = [];

    for (const url of lines) {
        const key = new URL(url).pathname.replace(/^\/wp-content\/uploads\//, '');
        const fullPath = path.join(uploadsRoot, 'wp-content', 'uploads', key);

        if (key === lastMp4Key) {
            console.log(`⛔️ Skipping last .mp4: ${key}`);
            continue;
        }

        if (fs.existsSync(fullPath)) {
            toDelete.push(fullPath);
        } else {
            console.warn(`⚠️ File does not exist: ${fullPath}`);
        }
    }

    console.log(`\n🗑️ Ready to delete ${toDelete.length} file(s).`);

    const answer = await askQuestion('❓ Do you want to delete them now? (y/N): ');
    if (answer.toLowerCase() === 'y') {
        for (const file of toDelete) {
            try {
                fs.unlinkSync(file);
                console.log(`✅ Deleted: ${file}`);
            } catch (err) {
                console.error(`❌ Failed to delete ${file}: ${(err as Error).message}`);
            }
        }
    } else {
        console.log('❌ No files deleted.');
    }

    console.log('✅ Cleanup complete.');
}
