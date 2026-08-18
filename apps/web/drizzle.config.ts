import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// drizzle-kit runs standalone from the CLI and does not load Next's .env.local
// (Next only loads it at app runtime; jest.env.ts does the same for tests).
// Load it here so DATABASE_URL is available for generate/migrate/push.
config({ path: '.env.local' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
