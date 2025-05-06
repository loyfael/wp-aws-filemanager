import dotenv from 'dotenv';
dotenv.config();

export const WP_TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'wp_';