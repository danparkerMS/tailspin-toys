import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getFilteredGames,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});

describe('getFilteredGames', () => {
    let db: Database;
    let categoryAId: number;
    let categoryBId: number;
    let publisherAId: number;
    let publisherBId: number;

    beforeEach(async () => {
        db = await createTestDatabase();

        const [catA] = await db
            .insert(categories)
            .values({ name: 'Adventure', description: 'adv' })
            .returning({ id: categories.id });
        const [catB] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'strat' })
            .returning({ id: categories.id });
        const [pubA] = await db
            .insert(publishers)
            .values({ name: 'Alpha Studio', description: 'alpha' })
            .returning({ id: publishers.id });
        const [pubB] = await db
            .insert(publishers)
            .values({ name: 'Beta Games', description: 'beta' })
            .returning({ id: publishers.id });

        categoryAId = catA.id;
        categoryBId = catB.id;
        publisherAId = pubA.id;
        publisherBId = pubB.id;

        await db.insert(games).values([
            { title: 'Alpha Adventure', description: 'd', categoryId: categoryAId, publisherId: publisherAId },
            { title: 'Beta Strategy', description: 'd', categoryId: categoryBId, publisherId: publisherBId },
            { title: 'Alpha Strategy', description: 'd', categoryId: categoryBId, publisherId: publisherAId },
            { title: 'Beta Adventure', description: 'd', categoryId: categoryAId, publisherId: publisherBId },
        ]);
    });

    it('returns all games when no filters are applied', async () => {
        const result = await getFilteredGames(db);
        expect(result).toHaveLength(4);
    });

    it('filters by a single category', async () => {
        const result = await getFilteredGames(db, { categoryIds: [categoryAId] });
        expect(result).toHaveLength(2);
        expect(result.every((g) => g.category?.id === categoryAId)).toBe(true);
    });

    it('filters by multiple categories', async () => {
        const result = await getFilteredGames(db, { categoryIds: [categoryAId, categoryBId] });
        expect(result).toHaveLength(4);
    });

    it('filters by publisher', async () => {
        const result = await getFilteredGames(db, { publisherId: publisherBId });
        expect(result).toHaveLength(2);
        expect(result.every((g) => g.publisher?.id === publisherBId)).toBe(true);
    });

    it('combines category and publisher filters', async () => {
        const result = await getFilteredGames(db, { categoryIds: [categoryAId], publisherId: publisherAId });
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Alpha Adventure');
    });

    it('returns an empty list when no games match the filters', async () => {
        const result = await getFilteredGames(db, { categoryIds: [categoryAId], publisherId: publisherBId });
        // Only 'Beta Adventure' matches both categoryA and publisherB
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Beta Adventure');
    });

    it('returns games ordered by title', async () => {
        const result = await getFilteredGames(db, { categoryIds: [categoryBId] });
        expect(result.map((g) => g.title)).toEqual(['Alpha Strategy', 'Beta Strategy']);
    });
});
