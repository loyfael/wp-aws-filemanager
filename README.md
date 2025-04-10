# 📦 wp-aws-filemanager

A complete migration, audit, and verification tool for moving WordPress images to AWS S3.

## 🔧 Requirements

- Node.js 18+
- TypeScript
- Access to the WordPress MySQL database
- A configured AWS S3 bucket

## ⚙️ Environment Configuration

Create a `.env` file at the root of your project with the following content:

```env
# Absolute path to your WordPress root directory (where wp-content is located)
LOCAL_UPLOADS_PATH=/var/www/vhosts/avicom-preprod.fr/subdomains/simone-nelson-preprod.fr

# Database connection (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_DATABASE=wordpress

# AWS credentials
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-3
AWS_BUCKET_NAME=wp-simonenelson-website

# WordPress uploads URL prefix
WP_UPLOADS_URL_PREFIX=https://simone-nelson.avicom-preprod.fr/wp-content/uploads/

# Website URL (used to audit image usage)
SITE_URL=https://simone-nelson.avicom-preprod.fr

# AWS base URL
AWS_BASE_URL=https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com
```

## 📁 Project Structure

```
.
├── src/
│   ├── commands/
│   │   ├── migrateImagesCommand.ts       # Migrates WordPress images to AWS
│   │   ├── auditImagesCommand.ts         # Audits which images can be deleted locally
│   │   └── checkSiteImagesCommand.ts     # Checks if the site uses AWS images and not local ones
│   ├── utils/
│   │   ├── metadata-parser.ts
│   │   ├── logger.ts
│   │   └── elementor-parser.ts
│   └── database/
│       └── mysql-stream.ts
```

## 🚀 Commands

### ➤ Migrate images to AWS

```bash
npm run migrate:images
```

- Downloads images from the WordPress server
- Uploads them to AWS S3
- Updates the `_wp_attachment_metadata` accordingly

### ➤ Audit local image files

```bash
npm run audit:images
```

- Checks which files are still present locally and already in AWS
- Optionally deletes redundant files
- Logs errors and warnings into `logs/audit.log`

### ➤ Verify online image usage

```bash
npm run check:site-images
```

- Parses the sitemap
- Checks that image URLs do not return 404
- Verifies that all image URLs point to AWS and not to the server
- Logs results to `logs/site-images.log`

## 📝 Logs

Logs are automatically written to:

```
logs/
├── audit.log
├── site-images.log
```

## ✅ TODO

- [x] AWS migration
- [x] Local + AWS audit
- [x] Online usage verification
- [ ] AWS orphaned files cleanup
- [ ] GitHub Actions integration

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

See [LICENSE](https://www.gnu.org/licenses/agpl-3.0.txt) for more details.