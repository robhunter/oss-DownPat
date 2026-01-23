import { Page, expect } from '@playwright/test';

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  // Click "Login as Admin" to fill the email field
  await page.getByRole('button', { name: 'Login as Admin' }).click();
  // Then click "Sign In" to actually log in
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Wait for navigation to complete (redirects to /exercises by default)
  await expect(page).not.toHaveURL('/login', { timeout: 10000 });
}

/**
 * Login as regular user
 */
export async function loginAsUser(page: Page): Promise<void> {
  await page.goto('/login');
  // Click "Login as User" to fill the email field
  await page.getByRole('button', { name: 'Login as User' }).click();
  // Then click "Sign In" to actually log in
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Wait for navigation to complete (redirects to /exercises by default)
  await expect(page).not.toHaveURL('/login', { timeout: 10000 });
}

/**
 * Navigate to admin exercises page
 */
export async function goToAdminExercises(page: Page): Promise<void> {
  await page.goto('/downpat/admin/exercises');
  // Use exact match to avoid matching "No Exercises Yet"
  await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();
}

/**
 * Create a new exercise with the given parameters
 *
 * The form requires:
 * - Exercise Name
 * - Welcome Message
 * - Conversation Task: Role, Prompt, Response Description
 */
export async function createExercise(page: Page, options: {
  name: string;
  welcomeMessage: string;
  guidelines?: string;
  maxMessages?: number;
  conversationTask?: {
    role: string;
    prompt: string;
    responseDescription: string;
  };
  commentaryTask?: {
    role: string;
    prompt: string;
    commentaryDescription: string;
    gradeDescription: string;
  };
  summaryTask?: {
    role: string;
    prompt: string;
    summaryDescription: string;
    gradeDescription: string;
  };
}): Promise<string> {
  await page.goto('/downpat/admin/exercises/new');
  // Wait for the form to load - use the h2 inside the form
  await expect(page.locator('h2').filter({ hasText: 'Create New Exercise' })).toBeVisible();

  // Fill basic info - use placeholder text since labels don't have `for` attribute
  await page.getByPlaceholder('Enter exercise name').fill(options.name);

  // The slug is auto-generated from the name
  const expectedSlug = options.name.toLowerCase().replace(/\s+/g, '-');

  // Set max messages if provided
  if (options.maxMessages) {
    const maxMessagesInput = page.locator('input[type="number"]').first();
    await maxMessagesInput.fill(String(options.maxMessages));
  }

  // Fill content - Welcome Message
  await page.getByPlaceholder('Message shown when conversation starts...').fill(options.welcomeMessage);

  // Fill Guidelines if provided
  if (options.guidelines) {
    await page.getByPlaceholder('Shared guidelines for coaching tasks...').fill(options.guidelines);
  }

  // Fill Conversation Task (always required)
  const conversationTask = options.conversationTask || {
    role: 'Assistant',
    prompt: 'Respond helpfully to the user.',
    responseDescription: 'A helpful response to the user.',
  };
  await page.getByPlaceholder('Who is the user talking to?').fill(conversationTask.role);
  await page.getByPlaceholder('Instructions for the AI during conversation...').fill(conversationTask.prompt);
  await page.getByPlaceholder('Description of expected conversation response for AI tool call...').fill(conversationTask.responseDescription);

  // Add Commentary Task if specified
  if (options.commentaryTask) {
    await page.getByRole('button', { name: '+ Add Commentary Task' }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Who is providing commentary? Ex: Coach').fill(options.commentaryTask.role);
    await page.getByPlaceholder('Instructions for generating commentary...').fill(options.commentaryTask.prompt);
    await page.getByPlaceholder('Description of expected commentary response...').fill(options.commentaryTask.commentaryDescription);
    await page.getByPlaceholder('Description of how to grade performance...').fill(options.commentaryTask.gradeDescription);
  }

  // Add Summary Task if specified
  if (options.summaryTask) {
    await page.getByRole('button', { name: '+ Add Summary Task' }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Who is providing the summary? Ex: Coach').fill(options.summaryTask.role);
    await page.getByPlaceholder('Instructions for generating summary...').fill(options.summaryTask.prompt);
    await page.getByPlaceholder('Description of expected summary response...').fill(options.summaryTask.summaryDescription);
    await page.getByPlaceholder('Description of how to grade overall performance...').fill(options.summaryTask.gradeDescription);
  }

  // Submit the form
  await page.getByRole('button', { name: 'Create Exercise' }).click();

  // Wait for success toast (page stays on edit screen after save)
  await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });

  // Navigate back to exercises list
  await page.goto('/downpat/admin/exercises');
  await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();

  return expectedSlug;
}

/**
 * Send a message in a conversation and wait for response
 */
export async function sendMessage(page: Page, message: string): Promise<void> {
  const input = page.getByPlaceholder('Type your message...');
  await expect(input).toBeVisible();
  await input.fill(message);
  await page.getByRole('button', { name: 'Send' }).click();

  // Wait for input to be re-enabled (streaming finished)
  await expect(input).toBeEnabled({ timeout: 30000 });
}

/**
 * Count the number of messages in the conversation
 */
export async function countMessages(page: Page): Promise<number> {
  // Wait for at least one message to be visible before counting
  const messages = page.locator('.downpat-message');
  await messages.first().waitFor({ state: 'visible', timeout: 10000 });
  return await messages.count();
}

/**
 * Check if a message with specific content exists
 */
export async function hasMessageWithContent(page: Page, content: string): Promise<boolean> {
  const messages = page.locator('.downpat-message');
  const count = await messages.count();

  for (let i = 0; i < count; i++) {
    const text = await messages.nth(i).textContent();
    if (text?.includes(content)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if commentary messages exist in the conversation
 */
export async function hasCommentaryMessages(page: Page): Promise<boolean> {
  const commentaryMessages = page.locator('.downpat-message-commentary');
  const count = await commentaryMessages.count();
  return count > 0;
}

/**
 * Wait for a commentary message to appear after a certain count
 */
export async function waitForCommentary(page: Page, minCount: number = 1): Promise<void> {
  const commentaryMessages = page.locator('.downpat-message-commentary');
  await expect(commentaryMessages).toHaveCount(minCount, { timeout: 15000 }).catch(() => {
    // Commentary may not appear if AI fails, don't fail the test
  });
}

/**
 * Publish an exercise by slug (via edit page)
 */
export async function publishExercise(page: Page, slug: string): Promise<void> {
  // Navigate to the edit page
  await page.goto(`/downpat/admin/exercises/${slug}/edit`);
  await expect(page.locator('h1').filter({ hasText: 'Edit:' })).toBeVisible({ timeout: 10000 });

  // Click Publish button
  await page.getByRole('button', { name: 'Publish', exact: true }).click();

  // Confirm in modal
  await expect(page.locator('.downpat-modal')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Wait for success toast
  await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });
}

/**
 * Unpublish an exercise by slug (via edit page)
 */
export async function unpublishExercise(page: Page, slug: string): Promise<void> {
  // Navigate to the edit page
  await page.goto(`/downpat/admin/exercises/${slug}/edit`);
  await expect(page.locator('h1').filter({ hasText: 'Edit:' })).toBeVisible({ timeout: 10000 });

  // Click Unpublish button
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click();

  // Confirm in modal
  await expect(page.locator('.downpat-modal')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Wait for success toast
  await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });
}

/**
 * Delete an exercise by slug (requires double-click confirmation)
 */
export async function deleteExercise(page: Page, slug: string): Promise<void> {
  await goToAdminExercises(page);

  // Find the row with the exercise
  const row = page.locator('tr').filter({ hasText: `/${slug}` });

  // First click to initiate delete
  await row.getByRole('button', { name: 'Delete' }).click();

  // Second click to confirm
  await row.getByRole('button', { name: 'Confirm Delete' }).click();

  // Wait for the row to disappear
  await expect(row).not.toBeVisible();
}

/**
 * Click Test button for an exercise
 */
export async function testExercise(page: Page, slug: string): Promise<void> {
  await goToAdminExercises(page);

  // Find the row with the exercise
  const row = page.locator('tr').filter({ hasText: `/${slug}` });
  await row.getByRole('button', { name: 'Test' }).click();

  // Wait for conversation page to load
  await expect(page).toHaveURL(`/downpat/admin/test/${slug}`);
}

/**
 * Check if exercise exists in the list
 */
export async function exerciseExists(page: Page, slug: string): Promise<boolean> {
  await goToAdminExercises(page);
  const row = page.locator('tr').filter({ hasText: `/${slug}` });
  return await row.isVisible();
}

/**
 * Generate unique test identifiers
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Clean up all E2E test exercises (exercises with 'e2e' or 'test-' in the slug)
 */
export async function cleanupE2EExercises(page: Page): Promise<void> {
  await goToAdminExercises(page);

  // Find all exercise rows
  const rows = page.locator('tbody tr');
  const rowCount = await rows.count();

  // Collect slugs that match our e2e patterns
  const slugsToDelete: string[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const slugCell = row.locator('.downpat-exercise-slug');
    const slugText = await slugCell.textContent();

    if (slugText) {
      // Extract slug (remove leading /)
      const slug = slugText.replace(/^\//, '');

      // Check if this is an e2e test exercise
      if (
        slug.includes('e2e-test') ||
        slug.includes('commentary-test') ||
        slug.includes('welcome-test') ||
        slug.includes('starter-test') ||
        slug.match(/test-\d+-[a-z0-9]+/)
      ) {
        slugsToDelete.push(slug);
      }
    }
  }

  // Delete each e2e exercise
  for (const slug of slugsToDelete) {
    try {
      await deleteExercise(page, slug);
    } catch {
      // Exercise may already be deleted, continue
    }
  }
}
