/**
 * Utility functions for item category mapping
 * for the database integration
 *
 * Note: Item IDs come from Temple OSRS API responses and are stored as metadata.
 * Item names are the unique identifiers.
 */

import { itemList } from '@/data/item-list';

// Simple LRU Cache implementation for function caching
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;

      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

// Create caches for the lookup functions
const categoryCache = new LRUCache<string, string>(500);
const validItemCache = new LRUCache<string, boolean>(500);

// Create a map for item names to categories from our internal item list
const itemNameToCategoryMap = new Map<string, string>();

// Cache for getAllItemNames result
let cachedAllItemNames: string[] | null = null;

// Initialize the category map from the existing item list
Object.entries(itemList).forEach(([category, itemCategory]) => {
  itemCategory.items.forEach((item) => {
    if (typeof item === 'object' && item.name) {
      itemNameToCategoryMap.set(item.name.toLowerCase(), category);
    }
  });
});

/**
 * Get item category from item name using our internal item list (cached by input)
 */
export function getCategoryFromItemName(itemName: string): string {
  const lowerName = itemName.toLowerCase();

  // Check cache first
  const cached = categoryCache.get(lowerName);
  if (cached !== undefined) {
    return cached;
  }

  // Compute and cache result
  const result = itemNameToCategoryMap.get(lowerName) ?? 'Unknown';
  categoryCache.set(lowerName, result);
  return result;
}

/**
 * Check if an item name exists in our item database (cached by input)
 */
export function isValidItemName(itemName: string): boolean {
  const lowerName = itemName.toLowerCase();

  // Check cache first
  const cached = validItemCache.get(lowerName);
  if (cached !== undefined) {
    return cached;
  }

  // Compute and cache result
  const result = itemNameToCategoryMap.has(lowerName);
  validItemCache.set(lowerName, result);
  return result;
}

/**
 * Get all valid item names from our internal list (cached result, same array returned)
 */
export function getAllItemNames(): string[] {
  return (cachedAllItemNames ??= Array.from(itemNameToCategoryMap.keys()));
}

/**
 * Process items from Temple OSRS API response format
 * The Temple API provides both item names and IDs, we store both but use names as identifiers
 */
export function processTempleItems(acquiredItems: Record<string, boolean>): {
  name: string;
  category: string;
  isValid: boolean;
}[] {
  return Object.entries(acquiredItems)
    .filter(([, acquired]) => acquired)
    .map(([name]) => {
      const category = getCategoryFromItemName(name);
      const isValid = isValidItemName(name);

      return {
        name,
        category,
        isValid,
      };
    });
}
