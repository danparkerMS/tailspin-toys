import { beforeEach, describe, expect, it } from 'vitest';
import { categories } from '../../db/schema';
import { createTestDatabase } from '../../db/test-helpers';
import { getAllCategories } from './categories';

describe('getAllCategories', () => {
    let db: Awaited<ReturnType<typeof createTestDatabase>>;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns category ids and names ordered by name', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'Turn-based strategy games' },
            { name: 'Adventure', description: 'Adventure games' },
        ]);

        const result = await getAllCategories(db);

        expect(result).toHaveLength(2);
        expect(result).toEqual([
            { id: expect.any(Number), name: 'Adventure' },
            { id: expect.any(Number), name: 'Strategy' },
        ]);
    });

    it('returns an empty list when no categories exist', async () => {
        await expect(getAllCategories(db)).resolves.toEqual([]);
    });
});
