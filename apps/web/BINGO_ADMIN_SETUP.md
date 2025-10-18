# Bingo Admin Setup

This document outlines the setup and usage of the new bingo admin system.

## Features

- **Discord OAuth Authentication**: Admin access is controlled via Discord user IDs
- **Database-backed Completions**: Task completions are stored in PostgreSQL using Drizzle ORM
- **Task Search**: Fuzzy search functionality for finding tasks by name, description, or ID
- **Multi-user Completions**: Support for multiple users contributing to the same task
- **Proof Tracking**: URL-based proof system for external verification

## Database Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Environment Variables

Add the following environment variable to your `.env.local`:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

For Neon PostgreSQL, this would look like:

```bash
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/database?sslmode=require
```

### 3. Database Migration

Generate and run the database migration:

```bash
yarn db:generate
yarn db:push
```

Or for development, you can use the studio:

```bash
yarn db:studio
```

## Admin Configuration

### 1. Add Admin Users

Edit `/apps/web/config/admin-users.ts` and add Discord user IDs to the `ADMIN_DISCORD_USER_IDS` array:

```typescript
export const ADMIN_DISCORD_USER_IDS: string[] = [
  '123456789012345678', // Add Discord user IDs here
  '987654321098765432',
];
```

To get a Discord user ID:

1. Enable Developer Mode in Discord settings
2. Right-click on a user and select "Copy User ID"

### 2. Access Admin Page

Navigate to `/bingo/admin` to access the admin interface.

## Usage

### Adding Task Completions

1. **Search for Task**: Use the search box to find tasks by name, description, or ID
2. **Select Task**: Click on a task from the search results
3. **Choose Clan**: Select which clan (Iron's Grotto or Iron Daddys) the completion is for
4. **Add Users**: Fill in user names and proof URLs
   - Each user should have their own entry
   - If a user contributed multiple items, create separate entries for each
5. **Submit**: Click "Submit Completions" to save to the database

### Database Schema

The `bingo_completions` table stores:

- `id`: Unique identifier (UUID)
- `task_id`: Reference to the bingo task
- `user`: Username who completed the task
- `proof`: URL to external proof (Discord, Imgur, etc.)
- `clan`: Which clan the completion belongs to ('ironsGrotto' or 'ironDaddy')
- `created_at`: Timestamp of when the completion was recorded

## Migration from JSON

The system now uses the database instead of the JSON file (`clan-completions.json`). The existing bingo board will automatically load completions from the database and display them correctly.

## Development

### Database Operations

```typescript
import { createCompletion, getCompletionsForClan } from '@/lib/db/completions';

// Create a new completion
await createCompletion({
  taskId: 'scrolls',
  user: 'PlayerName',
  proof: 'https://discord.com/channels/...',
  clan: 'ironsGrotto',
});

// Get completions for a specific clan
const completions = await getCompletionsForClan('ironsGrotto');
```

### Available Scripts

- `yarn db:generate` - Generate migration files
- `yarn db:migrate` - Run migrations
- `yarn db:push` - Push schema changes directly
- `yarn db:studio` - Open Drizzle Studio for database management
