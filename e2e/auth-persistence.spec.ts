import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsUser } from './helpers';

test.describe('Auth Token Persistence', () => {
  test('admin token persists after page refresh', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to exercises page
    await page.goto('/downpat/exercises');
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible();

    // First refresh - should stay logged in
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL('/login');

    // Second refresh - should still be logged in (this was the bug scenario)
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL('/login');

    // Third refresh for good measure
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL('/login');
  });

  test('user token persists after page refresh', async ({ page }) => {
    // Login as regular user
    await loginAsUser(page);

    // Navigate to exercises page
    await page.goto('/downpat/exercises');
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible();

    // First refresh
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL('/login');

    // Second refresh
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL('/login');
  });

  test('admin token persists after navigating to different pages', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to exercises page
    await page.goto('/downpat/exercises');
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible();

    // Navigate to admin exercises
    await page.goto('/downpat/admin/exercises');
    await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();

    // Refresh on admin page
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL('/login');

    // Navigate back to regular exercises
    await page.goto('/downpat/exercises');
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible();

    // Refresh again
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL('/login');
  });

  test('localStorage token is preserved during session', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to exercises page
    await page.goto('/downpat/exercises');
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible();

    // Check that token exists in localStorage
    const token = await page.evaluate(() => localStorage.getItem('downpat_token'));
    expect(token).not.toBeNull();
    expect(token).toBeTruthy();

    // Refresh the page
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });

    // Token should still be there
    const tokenAfterRefresh = await page.evaluate(() => localStorage.getItem('downpat_token'));
    expect(tokenAfterRefresh).toBe(token);

    // Second refresh
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exercises' })).toBeVisible({ timeout: 5000 });

    // Token should still be the same
    const tokenAfterSecondRefresh = await page.evaluate(() => localStorage.getItem('downpat_token'));
    expect(tokenAfterSecondRefresh).toBe(token);
  });
});
