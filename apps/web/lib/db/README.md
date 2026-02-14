# Player Database Operations

This module provides CRUD operations for the new relational player tracking system, replacing the previous JSON blob approach.

## Overview

The system consists of three main tables:

- `players` - Core player information and stats
- `player_acquired_items` - Individual item acquisitions with counts
- `player_achievement_diaries` - Achievement diary completion tracking

## Operations

### Player Operations

#### `createNewPlayer(data: CreatePlayerData): Promise<Player>`

Creates a new player record with all the core information.

**Required fields:**

- `playerName` - OSRS player name (max 12 characters, primary key)
- `joinDate` - Date player joined the clan
- `rank` - Current rank in the clan

**Optional fields:**

- Stats: `ehb`, `ehp`, `totalLevel`
- Collection log: `collectionLogCount`, `collectionLogTotal`
- Clue scroll counts for each tier
- High-level achievements: `tzhaarCape`, `hasBloodTorva`, etc.
- Bonus points for different categories

#### `updatePlayer(playerName: string, data: UpdatePlayerData): Promise<Player | null>`

Updates an existing player's information. Can update any field except `playerName` and `joinDate`.

### Acquired Items Operations

#### `addNewItem(data: AddItemData): Promise<PlayerAcquiredItem>`

Adds a new item acquisition record for a player.

#### `bulkUpdateItemCounts(updates: BulkItemUpdate[]): Promise<void>`

Efficiently updates item counts for multiple players in a single operation. Useful for periodic data synchronization.

### Achievement Diary Operations

#### `addAchievementDiary(data: AddAchievementDiaryData): Promise<PlayerAchievementDiary>`

Adds a new achievement diary record for a player.

#### `updateAchievementDiaryLevel(playerName: string, location: string, data: UpdateAchievementDiaryData): Promise<PlayerAchievementDiary | null>`

Updates an achievement diary's tier and/or completion status.

### Utility Operations

#### `getPlayerWithRelations(playerName: string): Promise<PlayerWithRelations | null>`

Retrieves a player along with all their acquired items and achievement diaries.

## Testing

The module includes comprehensive unit and integration tests:

### Unit Tests (`player-operations.test.ts`)

- Mock-based tests for all operations
- Edge case validation
- Data validation testing
- Includes mock data helpers for consistent testing

### Integration Tests (`player-operations.integration.test.ts`)

- Database integration tests (requires test DB)
- Full CRUD operation testing
- Relational data integrity testing
- Performance testing for bulk operations

### Running Tests

```bash
# Unit tests (fast, no DB required)
npm test player-operations.test.ts

# Integration tests (requires test database)
npm run test:integration player-operations.integration.test.ts
```

## Implementation Status

🚧 **All operations are currently stubs** - implementations need to be added:

1. Implement database queries using Drizzle ORM
2. Add proper error handling and validation
3. Implement transaction support for bulk operations
4. Add proper logging and monitoring

## Database Schema Notes

- Player names are limited to 12 characters (OSRS limit)
- All timestamps use PostgreSQL timestamp types
- Foreign key relationships are properly defined
- Indexes should be added for performance on common queries

## Migration Strategy

When migrating from JSON blob storage:

1. Create new tables using the schema
2. Write migration script to transform existing data
3. Update application code to use new operations
4. Remove old JSON storage logic

## Database Integration

These operations are designed to work with database integration patterns where:

- Data is ingested from multiple sources
- Updates happen in bulk periodically
- Read operations need to be fast for UI rendering
- Historical data tracking is important
