import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const bingoCompletions = pgTable('bingo_completions', {
    id: text('id').primaryKey().default('gen_random_uuid()'),
    taskId: text('task_id').notNull(),
    user: text('user').notNull(),
    proof: text('proof').notNull(),
    clan: text('clan').notNull(), // 'ironsGrotto' or 'ironDaddy'
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type BingoCompletion = typeof bingoCompletions.$inferSelect;
export type NewBingoCompletion = typeof bingoCompletions.$inferInsert;
