CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "bingo_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" text NOT NULL,
	"user" text NOT NULL,
	"proof" text NOT NULL,
	"clan" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);