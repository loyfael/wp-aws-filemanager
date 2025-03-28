# 🗂️ WordPress AWS S3 Image Migrator

A Node.js/TypeScript CLI tool to migrate WordPress images (including all resized versions) to AWS S3, directly from the `_wp_attachment_metadata` stored in the database.

---

## 🚀 Installation

```bash
git clone <repo>
cd <repo>
npm install
```

---

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=wp_user
DB_PASSWORD=wp_pass
DB_NAME=wp_db

# AWS
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=your_bucket_name
```

---

## 🧪 Running the CLI

```bash
npx ts-node index.ts
```

Then select one of the available commands.

---

## 📦 Available Commands

| Command                 | Description                                          |
|------------------------|------------------------------------------------------|
| `list`                 | List images with their available sizes               |
| `migrate`              | Run the full migration to AWS S3                     |
| `dry-run`              | Simulate migration for the first 500 images          |
| `rollback`             | Restore original metadata from backup                |
| `update-elementor-data` | Update Elementor image references if needed        |
| `s3:list`              | List current files in the configured S3 bucket       |

---

## 💾 Metadata Backup

Before updating image metadata in WordPress, the original values are saved in `/backup`.
