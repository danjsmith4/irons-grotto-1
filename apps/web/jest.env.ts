import { config } from 'dotenv';

// Runs via jest setupFiles, before the test framework and any module that reads
// process.env at import time (e.g. config/constants.*). Next intentionally skips
// .env.local when NODE_ENV=test, so load it explicitly here.
config({ path: '.env.local' });
