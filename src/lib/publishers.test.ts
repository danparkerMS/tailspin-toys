import { beforeEach, describe, expect, it } from 'vitest';
import { publishers } from '../../db/schema';
import { createTestDatabase } from '../../db/test-helpers';
import { getAllPublishers } from './publishers';

describe('getAllPublishers', () => {
    let db: Awaited<ReturnType<typeof createTestDatabase>>;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns publisher ids and names ordered by name', async () => {
        await db.insert(publishers).values([
            { name: 'Zeta Games', description: 'Zeta publisher' },
            { name: 'Alpha Games', description: 'Alpha publisher' },
        ]);

        const result = await getAllPublishers(db);

        expect(result).toHaveLength(2);
        expect(result).toEqual([
            { id: expect.any(Number), name: 'Alpha Games' },
            { id: expect.any(Number), name: 'Zeta Games' },
        ]);
    });

    it('returns an empty list when no publishers exist', async () => {
        await expect(getAllPublishers(db)).resolves.toEqual([]);
    });
});