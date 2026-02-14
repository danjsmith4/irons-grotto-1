import { describe, it, expect } from '@jest/globals';
import {
    getCategoryFromItemName,
    isValidItemName,
    getAllItemNames,
    processTempleItems
} from './item-mapping-utils'

describe('Item Mapping Utils', () => {
    describe('getCategoryFromItemName', () => {
        it('should return "Unknown" for non-existent item name', () => {
            const result = getCategoryFromItemName('NonExistentItem');
            expect(result).toBe('Unknown');
        });

        it('should be case-insensitive', () => {
            const lower = getCategoryFromItemName('nonexistentitem');
            const upper = getCategoryFromItemName('NONEXISTENTITEM');
            const mixed = getCategoryFromItemName('NonExistentItem');

            expect(lower).toBe('Unknown');
            expect(upper).toBe('Unknown');
            expect(mixed).toBe('Unknown');
        });

        it('should cache results', () => {
            // Call twice to test caching
            const result1 = getCategoryFromItemName('TestItem');
            const result2 = getCategoryFromItemName('TestItem');

            expect(result1).toBe(result2);
            expect(result1).toBe('Unknown');
        });
    });

    describe('isValidItemName', () => {
        it('should return false for non-existent items', () => {
            const result = isValidItemName('NonExistentItem');
            expect(result).toBe(false);
        });

        it('should be case-insensitive', () => {
            const lower = isValidItemName('nonexistentitem');
            const upper = isValidItemName('NONEXISTENTITEM');

            expect(lower).toBe(upper);
            expect(lower).toBe(false);
        });

        it('should cache results', () => {
            // Call twice to test caching
            const result1 = isValidItemName('TestItem');
            const result2 = isValidItemName('TestItem');

            expect(result1).toBe(result2);
            expect(result1).toBe(false);
        });
    });

    describe('getAllItemNames', () => {
        it('should return an array', () => {
            const result = getAllItemNames();
            expect(Array.isArray(result)).toBe(true);
        });

        it('should return the same array instance (cached)', () => {
            const result1 = getAllItemNames();
            const result2 = getAllItemNames();

            expect(result1).toBe(result2); // Same reference
        });
    });

    describe('processTempleItems', () => {
        it('should handle empty object', () => {
            const result = processTempleItems({});
            expect(result).toEqual([]);
        });

        it('should filter acquired items only', () => {
            const items = {
                'Item1': false,
                'Item2': true,
                'Item3': true,
            };
            const result = processTempleItems(items);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Item2');
            expect(result[1].name).toBe('Item3');
        });

        it('should include category and validity info', () => {
            const items = {
                'TestItem': true,
            };
            const result = processTempleItems(items);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                name: 'TestItem',
                category: 'Unknown',
                isValid: false,
            });
        });
    });
});