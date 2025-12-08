import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test file if it exists, otherwise use defaults
const envTestPath = resolve(__dirname, '../../.env.test');
config({ path: envTestPath });

// Set default test environment variables if not set
if (!process.env.OTG_DB_NAME_TEST) {
  process.env.OTG_DB_NAME_TEST = 'otogaleri_test';
}

if (!process.env.OTG_DB_HOST) {
  process.env.OTG_DB_HOST = process.env.OTG_DB_HOST || 'localhost';
}

if (!process.env.OTG_DB_USER) {
  process.env.OTG_DB_USER = process.env.OTG_DB_USER || 'root';
}

if (!process.env.OTG_DB_PASSWORD) {
  process.env.OTG_DB_PASSWORD = process.env.OTG_DB_PASSWORD || '';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'otogaleri-secret-change-in-production';
}

// Also load main .env for other configs
config({ path: resolve(__dirname, '../../.env') });

