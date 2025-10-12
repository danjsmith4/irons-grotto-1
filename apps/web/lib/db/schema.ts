import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql/sql';

// uuid-ossp extension is required for gen_random_uuid()
// Make sure to enable it in your database with: CREATE EXTENSION IF NOT EXISTS "pgcrypto";



export const bingoCompletions = pgTable('bingo_completions', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    taskId: text('task_id').notNull(),
    user: text('user').notNull(),
    proof: text('proof').notNull(),
    clan: text('clan').notNull(), // 'ironsGrotto' or 'ironDaddy'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    points: text('points').default('0').notNull(), // Points awarded for the completion
});

export type BingoCompletion = typeof bingoCompletions.$inferSelect;
export type NewBingoCompletion = typeof bingoCompletions.$inferInsert;
