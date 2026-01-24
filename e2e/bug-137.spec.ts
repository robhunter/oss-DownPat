import { test, expect } from '@playwright/test';
import { loginAsAdmin, createExercise, publishExercise, deleteExercise, generateTestId } from './helpers';

test.describe('Bug #137: Button state after editing published exercise', () => {
  let testSlug: string;
  const testId = generateTestId();

  test.afterAll(async ({ browser }) => {
    // Cleanup
    if (testSlug) {
      const page = await browser.newPage();
      await loginAsAdmin(page);
      await deleteExercise(page, testSlug).catch(() => {});
      await page.close();
    }
  });

  test('Buttons update after saving a published-only exercise', async ({ page }) => {
    await loginAsAdmin(page);

    // Create a fresh exercise with all required fields
    testSlug = await createExercise(page, {
      name: `Bug137 Test ${testId}`,
      welcomeMessage: 'Welcome to the bug test',
      guidelines: 'Be helpful',
      maxMessages: 10,
      conversationTask: {
        role: 'Assistant',
        prompt: 'Respond helpfully to the user.',
        responseDescription: 'A helpful response to the user.',
      },
    });

    // Publish it
    await publishExercise(page, testSlug);

    // Now go to edit page - should be published-only (no draft)
    await page.goto(`/downpat/admin/exercises/${testSlug}/edit`);
    await expect(page.locator('h1').filter({ hasText: 'Edit:' })).toBeVisible({ timeout: 10000 });

    const publishBtn = page.getByRole('button', { name: 'Publish', exact: true });
    const unpublishBtn = page.getByRole('button', { name: 'Unpublish', exact: true });
    const restoreBtn = page.getByRole('button', { name: 'Restore from Published', exact: true });

    // Should only see Unpublish button (no draft exists) - wait for it to be visible first
    await expect(unpublishBtn).toBeVisible({ timeout: 10000 });
    await expect(publishBtn).not.toBeVisible();
    await expect(restoreBtn).not.toBeVisible();

    // Make a change
    const nameInput = page.getByPlaceholder('Enter exercise name');
    await nameInput.fill(`Bug137 Test ${testId} MODIFIED`);

    // Save
    await page.getByRole('button', { name: 'Update Exercise' }).click();

    // Wait for success toast
    await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });

    // BUG: After save, we should see Publish, Unpublish, AND Restore buttons
    // because now there's both a draft and a published version
    // Wait for the Publish button to appear (indicates metadata refresh completed)
    await expect(publishBtn).toBeVisible({ timeout: 10000 });
    await expect(unpublishBtn).toBeVisible();
    await expect(restoreBtn).toBeVisible();
  });

  test('Bug 2: Save after restore should not 404', async ({ page }) => {
    await loginAsAdmin(page);

    // Create a fresh exercise
    const testId2 = generateTestId();
    const slug = await createExercise(page, {
      name: `Bug137 Restore Test ${testId2}`,
      welcomeMessage: 'Welcome to the restore test',
      maxMessages: 10,
      conversationTask: {
        role: 'Assistant',
        prompt: 'Respond helpfully.',
        responseDescription: 'A helpful response.',
      },
    });

    // Publish it
    await publishExercise(page, slug);

    // Go to edit page
    await page.goto(`/downpat/admin/exercises/${slug}/edit`);
    await expect(page.locator('h1').filter({ hasText: 'Edit:' })).toBeVisible({ timeout: 10000 });

    // Make a change to create a draft
    const nameInput = page.getByPlaceholder('Enter exercise name');
    await nameInput.fill(`Bug137 Restore Test ${testId2} MODIFIED`);
    await page.getByRole('button', { name: 'Update Exercise' }).click();
    await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });

    // Wait for Restore button to appear (indicates draft was created)
    const restoreBtn = page.getByRole('button', { name: 'Restore from Published', exact: true });
    await expect(restoreBtn).toBeVisible({ timeout: 10000 });

    // Now restore from published
    await restoreBtn.click();
    await expect(page.locator('.downpat-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });

    // Wait for form to be ready after restore (input should be enabled)
    await expect(nameInput).toBeEnabled({ timeout: 10000 });

    // Make another change after restore
    await nameInput.fill(`Bug137 Restore Test ${testId2} AFTER RESTORE`);

    // Save - this should NOT 404
    await page.getByRole('button', { name: 'Update Exercise' }).click();

    // Should see success toast, not an error
    await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });

    // Verify no error appeared
    const errorToast = page.locator('.downpat-toast--error');
    expect(await errorToast.count()).toBe(0);

    // Cleanup
    await deleteExercise(page, slug).catch(() => {});
  });

  test('Bug 3: Form content should revert after restore', async ({ page }) => {
    await loginAsAdmin(page);

    // Create a fresh exercise with a known name
    const testId3 = generateTestId();
    const originalName = `Bug137 Revert Test ${testId3}`;
    const modifiedName = `${originalName} MODIFIED`;

    const slug = await createExercise(page, {
      name: originalName,
      welcomeMessage: 'Welcome to the revert test',
      maxMessages: 10,
      conversationTask: {
        role: 'Assistant',
        prompt: 'Respond helpfully.',
        responseDescription: 'A helpful response.',
      },
    });

    // Publish it
    await publishExercise(page, slug);

    // Go to edit page
    await page.goto(`/downpat/admin/exercises/${slug}/edit`);
    await expect(page.locator('h1').filter({ hasText: 'Edit:' })).toBeVisible({ timeout: 10000 });

    // Verify original name is shown
    const nameInput = page.getByPlaceholder('Enter exercise name');
    await expect(nameInput).toHaveValue(originalName);

    // Make a change to create a draft
    await nameInput.fill(modifiedName);
    await page.getByRole('button', { name: 'Update Exercise' }).click();
    await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });

    // Wait for Restore button to appear (indicates draft was created and metadata refreshed)
    const restoreBtn = page.getByRole('button', { name: 'Restore from Published', exact: true });
    await expect(restoreBtn).toBeVisible({ timeout: 10000 });

    // Verify the modified name is in the form
    await expect(nameInput).toHaveValue(modifiedName);

    // Now restore from published
    await restoreBtn.click();
    await expect(page.locator('.downpat-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });

    // BUG FIX: Form content should now show the original (published) name, not the modified name
    // The assertion itself waits for the value to match
    await expect(nameInput).toHaveValue(originalName, { timeout: 10000 });

    // Cleanup
    await deleteExercise(page, slug).catch(() => {});
  });
});
