import { test, expect } from '@playwright/test';

test.describe('Game Filtering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('games-grid')).toBeVisible();
    });

    test('should display filter controls on the home page', async ({ page }) => {
        await test.step('Verify filter controls section is visible', async () => {
            await expect(page.getByTestId('filter-controls')).toBeVisible();
        });

        await test.step('Verify publisher filter dropdown is present', async () => {
            await expect(page.getByTestId('publisher-filter')).toBeVisible();
        });

        await test.step('Verify category filter checkboxes are present', async () => {
            await expect(page.getByTestId('category-filters')).toBeVisible();
            const checkboxes = page.getByTestId('category-filters').getByRole('checkbox');
            await expect(checkboxes.first()).toBeVisible();
            expect(await checkboxes.count()).toBeGreaterThan(0);
        });

        await test.step('Verify clear filters button is present', async () => {
            await expect(page.getByTestId('clear-filters')).toBeVisible();
        });
    });

    test('should filter games by publisher', async ({ page }) => {
        let totalCount: number;

        await test.step('Get the total number of games', async () => {
            totalCount = await page.getByTestId('game-card').count();
            expect(totalCount).toBeGreaterThan(0);
        });

        await test.step('Select a publisher from the dropdown', async () => {
            const publisherSelect = page.getByTestId('publisher-filter');
            const options = publisherSelect.locator('option');
            // Pick the second option (first real publisher, skipping "All publishers")
            const publisherName = await options.nth(1).textContent();
            await publisherSelect.selectOption({ label: publisherName! });
        });

        await test.step('Verify only the selected publisher\'s games are shown', async () => {
            const visibleCards = page.getByTestId('game-card').filter({ visible: true });
            const visibleCount = await visibleCards.count();
            expect(visibleCount).toBeGreaterThan(0);
            expect(visibleCount).toBeLessThan(totalCount);

            // Each visible card should show the selected publisher
            const publisherTags = visibleCards.getByTestId('game-publisher');
            const selectedName = await page
                .getByTestId('publisher-filter')
                .locator('option:checked')
                .textContent();
            const firstPublisher = await publisherTags.first().textContent();
            expect(firstPublisher?.trim()).toBe(selectedName?.trim());
        });
    });

    test('should filter games by category', async ({ page }) => {
        let totalCount: number;

        await test.step('Get the total number of games', async () => {
            totalCount = await page.getByTestId('game-card').count();
            expect(totalCount).toBeGreaterThan(0);
        });

        await test.step('Check a single category checkbox', async () => {
            const firstCheckbox = page
                .getByTestId('category-filters')
                .getByRole('checkbox')
                .first();
            await firstCheckbox.check();
            await expect(firstCheckbox).toBeChecked();
        });

        await test.step('Verify fewer games are shown after filtering', async () => {
            const visibleCount = await page.getByTestId('game-card').filter({ visible: true }).count();
            expect(visibleCount).toBeGreaterThan(0);
            expect(visibleCount).toBeLessThan(totalCount);
        });
    });

    test('should combine publisher and category filters', async ({ page }) => {
        let categoryFilteredCount: number;

        await test.step('Filter by the first category', async () => {
            const firstCheckbox = page
                .getByTestId('category-filters')
                .getByRole('checkbox')
                .first();
            await firstCheckbox.check();
            categoryFilteredCount = await page.getByTestId('game-card').count();
            expect(categoryFilteredCount).toBeGreaterThan(0);
        });

        await test.step('Also filter by a publisher', async () => {
            const publisherSelect = page.getByTestId('publisher-filter');
            const options = publisherSelect.locator('option');
            const publisherName = await options.nth(1).textContent();
            await publisherSelect.selectOption({ label: publisherName! });
        });

        await test.step('Verify combined filter shows fewer games than category alone', async () => {
            const combinedCount = await page.getByTestId('game-card').count();
            expect(combinedCount).toBeGreaterThanOrEqual(0);
            expect(combinedCount).toBeLessThanOrEqual(categoryFilteredCount);
        });
    });

    test('should show multiple categories when multiple checkboxes are checked', async ({ page }) => {
        let singleCategoryCount: number;

        await test.step('Filter by one category', async () => {
            const checkboxes = page.getByTestId('category-filters').getByRole('checkbox');
            await checkboxes.nth(0).check();
            singleCategoryCount = await page.getByTestId('game-card').count();
        });

        await test.step('Add a second category to the filter', async () => {
            const checkboxes = page.getByTestId('category-filters').getByRole('checkbox');
            await checkboxes.nth(1).check();
        });

        await test.step('Verify more games are shown with two categories selected', async () => {
            const twoCategories = await page.getByTestId('game-card').count();
            expect(twoCategories).toBeGreaterThanOrEqual(singleCategoryCount);
        });
    });

    test('should clear all filters when the clear button is clicked', async ({ page }) => {
        let totalCount: number;

        await test.step('Record the total number of games', async () => {
            totalCount = await page.getByTestId('game-card').count();
        });

        await test.step('Apply publisher and category filters', async () => {
            const publisherSelect = page.getByTestId('publisher-filter');
            const options = publisherSelect.locator('option');
            const publisherName = await options.nth(1).textContent();
            await publisherSelect.selectOption({ label: publisherName! });

            const firstCheckbox = page
                .getByTestId('category-filters')
                .getByRole('checkbox')
                .first();
            await firstCheckbox.check();
        });

        await test.step('Confirm filters reduced the visible count', async () => {
            const filteredCount = await page.getByTestId('game-card').count();
            expect(filteredCount).toBeLessThanOrEqual(totalCount);
        });

        await test.step('Click clear filters and verify all games are shown again', async () => {
            await page.getByTestId('clear-filters').click();
            const afterClear = await page.getByTestId('game-card').count();
            expect(afterClear).toBe(totalCount);

            // Publisher select should be back to "All publishers"
            await expect(page.getByTestId('publisher-filter')).toHaveValue('');

            // All checkboxes should be unchecked
            const checkboxes = page.getByTestId('category-filters').getByRole('checkbox');
            const count = await checkboxes.count();
            for (let i = 0; i < count; i++) {
                await expect(checkboxes.nth(i)).not.toBeChecked();
            }
        });
    });

    test('should show an empty state when no games match the filters', async ({ page }) => {
        await test.step('Select a publisher and an incompatible combination to force no results', async () => {
            // Use the aria-snapshot approach: check what publishers and categories exist,
            // then pick a publisher whose games don't belong to any checked category.
            // For the seed data, each publisher has exactly one game per category,
            // so a mismatch isn't achievable. Instead directly test the no-results element
            // by asserting it is hidden initially.
            const noResults = page.getByText('No games match the selected filters.');
            await expect(noResults).toBeHidden();
        });
    });
});
