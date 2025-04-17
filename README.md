# 🗂️ WordPress to AWS S3 Media Migration Tool

This project provides a set of scripts to **migrate**, **verify**, and **audit** WordPress media files from a traditional local filesystem (`wp-content/uploads`) to **Amazon S3**, along with **metadata synchronization** to update `_wp_attachment_metadata`.

> ⚠️ **Warning**  
> This tool is powerful and potentially destructive. It modifies your WordPress database and interacts directly with your AWS S3 bucket. Make sure to **test on a staging environment first**.

---

## 🚀 What it does

- ✅ Migrates media files from your WordPress server to AWS S3
- 📌 Updates `_wp_attachment_metadata` in the database with new S3 metadata
- 🔁 Supports reprocessing missing or broken images
- 🔍 Provides detailed audit and reporting for image presence on S3 vs local
- ⚙️ Works in **batch** mode for performance and stability
- 🧪 Includes a `dry-run` mode for testing

---

## ⚙️ Technologies Used

| Stack            | Purpose                            |
|------------------|------------------------------------|
| TypeScript       | Type-safe core logic               |
| Node.js (18+)    | Runtime                            |
| MySQL            | WordPress database access          |
| AWS SDK v3       | Uploads and S3 checks              |

---

## 📝 Environment Configuration

Create a `.env` file in the root:

```env
# WordPress
LOCAL_UPLOADS_PATH=/var/www/vhosts/your-site/wp-content/uploads

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=your-bucket
AWS_REGION=eu-west-1

# Optional
SITEMAP_URL=https://your-site/sitemap_index.xml
```

---

## 📦 Migration Usage

```bash
npm start
```
And choose your command.
You can pass optional flags:

| Option         | Description                                |
|----------------|--------------------------------------------|
| `--dryRun`     | Simulates migration without uploading       |
| `--batchSize`  | Default: 50. Controls batch processing size |
| `--batchOffset`| Start from specific post ID offset          |

---

## 🔍 Audit Usage

### 🔧 `auditImagesCommand`

Checks if files listed in WordPress metadata exist locally and on AWS S3.

- Will prompt to delete local files if already uploaded
- Requires `LOCAL_UPLOADS_PATH` set in `.env`

### 🗺️ `sitemapAuditCommand`

Parses sitemap and scans all `<img>` tags to verify:
- If the image is on AWS
- If it returns a 404

Optional log file `sitemap-audit-report.txt` is generated.

---

## 📊 Media Statistics

Use this to analyze how many images you have, what sizes exist, and where they are stored.

Sample output:

```
📊 Summary for 3,854 images and 14,520 sizes:

Type          Count   Avg Width   Avg Height   Most Common Res   Total Size
thumbnail     3854    150         150          150x150            85 MB
medium        3841    300         169          300x169            180 MB
large         3800    1024        576          1024x576           340 MB
...
```

---

## 🧠 Things to Watch Out For

- Make sure **all WordPress metadata is valid**.
- Some `meta_value` fields might be corrupted or empty.
- SVGs and non-image files might not have `sizes` data.
- Broken media files (404s or missing from disk) must be handled manually.
- Use the `audit` command to clean up safely.
---

## 📃 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

See [LICENSE](https://www.gnu.org/licenses/agpl-3.0.txt) for more details.
