// Load environment variables for Jest tests
// This follows the same pattern as Next.js for loading .env files
import { existsSync } from 'fs';
import { resolve } from 'path';

// Manually load env files in the same order Next.js does:
// .env.local, .env.production/.env.development, .env
const mode = process.env.NODE_ENV || 'test';
const envFiles = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), `.env.${mode}`),
    resolve(process.cwd(), '.env'),
];

// Load each env file that exists
for (const envFile of envFiles) {
    if (existsSync(envFile)) {
        // Use require to load dotenv config
        require('dotenv').config({ path: envFile });
    }
}