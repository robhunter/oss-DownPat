import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsUser,
  goToAdminExercises,
  createExercise,
  sendMessage,
  countMessages,
  hasMessageWithContent,
  hasCommentaryMessages,
  waitForCommentary,
  publishExercise,
  unpublishExercise,
  deleteExercise,
  testExercise,
  exerciseExists,
  generateTestId,
  cleanupE2EExercises,
} from './helpers';

// Global cleanup after all tests complete
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await loginAsAdmin(page);
  await cleanupE2EExercises(page);
  await page.close();
});

test.describe('Admin Exercise Management', () => {
  test.describe.configure({ mode: 'serial' });

  let testSlug: string;
  const testId = generateTestId();

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('can create an exercise and have 3+ message conversation via Test', async ({ page }) => {
    const exerciseName = `E2E Test ${testId}`;
    const welcomeMessage = 'Welcome to the E2E test exercise!';
    const guidelines = 'You are a helpful assistant for testing. Keep responses very brief (1-2 sentences max).';

    // Create the exercise
    testSlug = await createExercise(page, {
      name: exerciseName,
      welcomeMessage,
      guidelines,
      maxMessages: 10,
      conversationTask: {
        role: 'Assistant',
        prompt: 'Respond helpfully and briefly to the user.',
        responseDescription: 'A brief, helpful response.',
      },
    });

    // Verify exercise appears in the list
    await goToAdminExercises(page);
    const exerciseRow = page.locator('tr').filter({ hasText: `/${testSlug}` });
    await expect(exerciseRow).toBeVisible();
    await expect(exerciseRow.locator('.downpat-status-badge--draft')).toBeVisible();

    // Click Test button
    await testExercise(page, testSlug);

    // Verify the conversation page loaded
    await expect(page.getByText('Admin Test')).toBeVisible();

    // Send 3 messages and verify responses
    await sendMessage(page, 'Hello, this is message 1');
    let messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(2); // Welcome + user + AI response

    await sendMessage(page, 'This is message 2');
    messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(4);

    await sendMessage(page, 'This is message 3');
    messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(6);

    // Verify we had a real conversation
    await expect(await hasMessageWithContent(page, 'message 1')).toBe(true);
    await expect(await hasMessageWithContent(page, 'message 2')).toBe(true);
    await expect(await hasMessageWithContent(page, 'message 3')).toBe(true);
  });

  test('can publish exercise and have conversation at published route', async ({ page }) => {
    // Publish the exercise
    await publishExercise(page, testSlug);

    // Verify status changed to Published
    await goToAdminExercises(page);
    const exerciseRow = page.locator('tr').filter({ hasText: `/${testSlug}` });
    await expect(exerciseRow.locator('.downpat-status-badge--published')).toBeVisible();

    // Login as regular user
    await loginAsUser(page);

    // Navigate to the published exercise
    await page.goto(`/downpat/exercises/${testSlug}`);

    // Wait for conversation to load
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 10000 });

    // Have a conversation with 3+ messages
    await sendMessage(page, 'Hello from published route - message 1');
    let messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(2);

    await sendMessage(page, 'Published route message 2');
    messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(4);

    await sendMessage(page, 'Published route message 3');
    messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(6);
  });

  test('can unpublish exercise and verify route is blocked', async ({ page }) => {
    // Unpublish the exercise (as admin)
    await unpublishExercise(page, testSlug);

    // Login as regular user
    await loginAsUser(page);

    // Try to navigate to the now-unpublished exercise
    await page.goto(`/downpat/exercises/${testSlug}`);

    // Wait for either an error message OR confirm conversation never starts
    // (stuck on loading = exercise not accessible)
    const errorVisible = await page.getByText(/error|not found|unavailable/i).isVisible().catch(() => false);
    if (!errorVisible) {
      // If no immediate error, verify conversation input never appears (stays stuck on loading)
      const inputVisible = await page.getByPlaceholder('Type your message...').isVisible({ timeout: 5000 }).catch(() => false);
      expect(inputVisible).toBe(false);
      // Verify we're still on loading state
      await expect(page.getByText('Starting conversation...')).toBeVisible();
    }
  });

  test('can delete exercise and confirm it is gone', async ({ page }) => {
    // Delete the exercise
    await deleteExercise(page, testSlug);

    // Verify exercise no longer appears in the list
    const exists = await exerciseExists(page, testSlug);
    expect(exists).toBe(false);

    // Verify the test route doesn't work - will either show error or hang on loading
    await page.goto(`/downpat/admin/test/${testSlug}`);
    const errorVisible = await page.getByText(/error|not found/i).isVisible().catch(() => false);
    if (!errorVisible) {
      // If no immediate error, verify conversation never starts (stays stuck on loading)
      const inputVisible = await page.getByPlaceholder('Type your message...').isVisible({ timeout: 5000 }).catch(() => false);
      expect(inputVisible).toBe(false);
    }
  });
});

test.describe('Exercise with Commentary', () => {
  let commentarySlug: string;
  const testId = generateTestId();

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('can create exercise with commentary task and verify commentary renders', async ({ page }) => {
    const exerciseName = `Commentary Test ${testId}`;

    // Create exercise with commentary task
    commentarySlug = await createExercise(page, {
      name: exerciseName,
      welcomeMessage: 'Welcome! I will provide commentary on your messages.',
      guidelines: 'You are a helpful assistant. Always respond briefly.',
      maxMessages: 10,
      conversationTask: {
        role: 'Assistant',
        prompt: 'Respond to the user helpfully in 1-2 sentences.',
        responseDescription: 'A helpful response in 1-2 sentences.',
      },
      commentaryTask: {
        role: 'Coach',
        prompt: 'Provide brief coaching commentary on the conversation (1 sentence).',
        commentaryDescription: 'Brief coaching commentary.',
        gradeDescription: 'Grade the response quality.',
      },
    });

    // Test the exercise
    await testExercise(page, commentarySlug);

    // Send messages and look for commentary
    await sendMessage(page, 'Hello, please help me practice');
    await waitForCommentary(page, 1); // Wait for first commentary to render

    await sendMessage(page, 'Can you give me feedback?');
    await waitForCommentary(page, 2); // Wait for second commentary

    await sendMessage(page, 'Thanks for the coaching');
    await waitForCommentary(page, 3); // Wait for third commentary

    // Check for commentary messages
    // Commentary messages should have a different styling/class
    const hasCommentary = await hasCommentaryMessages(page);
    expect(hasCommentary).toBe(true);

    // This test verifies the messages exist - commentary styling depends on implementation
    const messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(6); // At least welcome + 3 user + responses

    // Cleanup - delete the exercise
    await deleteExercise(page, commentarySlug);
  });
});

test.describe('Exercise with Starters', () => {
  let starterSlug: string;
  const testId = generateTestId();

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('can create exercise with starter and verify it appears as first message', async ({ page }) => {
    const exerciseName = `Starter Test ${testId}`;
    const starterText = 'Hello! I am your practice partner for today. How can I help you get started?';
    const starterContext = 'SECRET_CONTEXT: The user is practicing for a job interview at a tech company.';
    const welcomeMessage = 'Welcome to the exercise!';

    // Create exercise with a starter using the new structure
    await page.goto('/downpat/admin/exercises/new');
    await expect(page.locator('h2').filter({ hasText: 'Create New Exercise' })).toBeVisible();

    // Fill basic info
    await page.getByPlaceholder('Enter exercise name').fill(exerciseName);
    starterSlug = exerciseName.toLowerCase().replace(/\s+/g, '-');

    // Fill content
    await page.getByPlaceholder('Message shown when conversation starts...').fill(welcomeMessage);

    // Fill the starter text
    await page.getByPlaceholder('Opening message shown to the user...').fill(starterText);

    // Expand starter options to add context
    await page.getByRole('button', { name: 'Show Options' }).click();
    await page.getByPlaceholder('Additional context for the AI about this scenario (not shown to user)...').fill(starterContext);

    // Fill Conversation Task (always visible in new form)
    await page.getByPlaceholder('Who is the user talking to?').fill('Assistant');
    await page.getByPlaceholder('Instructions for the AI during conversation...').fill('Respond helpfully.');
    await page.getByPlaceholder("ex: Response to the user's message").fill('A helpful response.');

    // Create the exercise
    await page.getByRole('button', { name: 'Create Exercise' }).click();
    await expect(page.locator('.downpat-toast--success')).toBeVisible({ timeout: 10000 });
    await page.goto('/downpat/admin/exercises');
    await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();

    // Test the exercise
    await testExercise(page, starterSlug);

    // Wait for conversation to load
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 10000 });

    // Wait for messages to render
    await page.waitForTimeout(1000);

    // ISSUE CHECK: Starter should appear exactly ONCE (not twice)
    const allMessages = page.locator('.downpat-message');
    const messageCount = await allMessages.count();

    // Count how many times the starter text appears
    let starterOccurrences = 0;
    for (let i = 0; i < messageCount; i++) {
      const text = await allMessages.nth(i).textContent();
      if (text?.includes(starterText)) {
        starterOccurrences++;
      }
    }
    expect(starterOccurrences).toBe(1); // Starter should appear exactly once

    // Find the starter message (contains starterText) and verify it doesn't show "System" as role
    // The starter should have an AI-like header (from attributes.name or "Assistant"), not "System"
    const starterMessage = page.locator('.downpat-message').filter({ hasText: starterText });
    const starterMessageText = await starterMessage.textContent();
    expect(starterMessageText).not.toContain('System');

    // Verify the starter appears as a message (not as clickable buttons)
    const hasStarter = await hasMessageWithContent(page, starterText);
    expect(hasStarter).toBe(true);

    // CONTEXT CHECK: Context SHOULD appear in the UI
    const contextOccurrences = await page.locator('.downpat-message').filter({ hasText: 'SECRET_CONTEXT' }).count();
    expect(contextOccurrences).toBe(1); // Context should be visible to user

    // Welcome message SHOULD appear even when starters are defined
    const welcomeOccurrences = await page.locator('.downpat-message').filter({ hasText: welcomeMessage }).count();
    expect(welcomeOccurrences).toBe(1); // Welcome message should appear

    // Verify there are no starter buttons (old incorrect behavior)
    const starterButtons = page.locator('button').filter({ hasText: starterText });
    await expect(starterButtons).toHaveCount(0);

    // Verify we can still have a conversation by responding to the starter
    await sendMessage(page, 'I would like to practice my communication skills.');

    // Verify the message was sent and we got a response
    const finalMessageCount = await countMessages(page);
    expect(finalMessageCount).toBeGreaterThanOrEqual(3); // Starter + user message + AI response

    // Cleanup
    await deleteExercise(page, starterSlug);
  });
});

test.describe('New Conversation Button', () => {
  let newConvSlug: string;
  const testId = generateTestId();

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('can start a new conversation from existing conversation', async ({ page }) => {
    const exerciseName = `New Conv Test ${testId}`;
    const welcomeMessage = 'Welcome to the new conversation test!';

    // Create exercise
    newConvSlug = await createExercise(page, {
      name: exerciseName,
      welcomeMessage,
      guidelines: 'You are a helpful assistant. Keep responses very brief.',
      maxMessages: 10,
      conversationTask: {
        role: 'Assistant',
        prompt: 'Respond briefly in 1 sentence.',
        responseDescription: 'A brief response in 1 sentence.',
      },
    });

    // Test the exercise
    await testExercise(page, newConvSlug);

    // Wait for conversation to load
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 10000 });

    // Verify the welcome message is displayed
    await expect(page.getByText(welcomeMessage)).toBeVisible({ timeout: 5000 });

    // Send a message
    await sendMessage(page, 'This is my first message in conversation 1');
    let messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(3); // Welcome + user + AI response

    // Verify the message is there
    await expect(await hasMessageWithContent(page, 'conversation 1')).toBe(true);

    // Click the New Conversation button
    const newConvButton = page.locator('.downpat-new-conversation-btn');
    await expect(newConvButton).toBeVisible();
    await newConvButton.click();

    // Wait for loading state to appear and resolve
    await expect(page.getByText('Starting conversation...')).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 10000 });

    // Verify the old messages are gone
    await expect(await hasMessageWithContent(page, 'conversation 1')).toBe(false);

    // Verify the welcome message is back (fresh conversation)
    await expect(page.getByText(welcomeMessage)).toBeVisible({ timeout: 5000 });

    // Can have a new conversation
    await sendMessage(page, 'This is my first message in conversation 2');
    messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(3);

    // Verify the new message is there
    await expect(await hasMessageWithContent(page, 'conversation 2')).toBe(true);

    // Cleanup
    await deleteExercise(page, newConvSlug);
  });
});

test.describe('Exercise with Welcome Message', () => {
  let welcomeSlug: string;
  const testId = generateTestId();

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('can create exercise with welcome message and verify it renders', async ({ page }) => {
    const exerciseName = `Welcome Test ${testId}`;
    const uniqueWelcomeMessage = `UNIQUE_WELCOME_${testId}: Hello and welcome to this special exercise!`;

    // Create exercise with distinctive welcome message
    welcomeSlug = await createExercise(page, {
      name: exerciseName,
      welcomeMessage: uniqueWelcomeMessage,
      guidelines: 'You are a helpful assistant.',
      maxMessages: 5,
      conversationTask: {
        role: 'Assistant',
        prompt: 'Respond briefly.',
        responseDescription: 'A brief response.',
      },
    });

    // Test the exercise
    await testExercise(page, welcomeSlug);

    // Verify the welcome message is displayed
    await expect(page.getByText(uniqueWelcomeMessage)).toBeVisible({ timeout: 10000 });

    // The welcome message should be the first message in the conversation
    const firstMessage = page.locator('.downpat-message').first();
    await expect(firstMessage).toContainText('UNIQUE_WELCOME');

    // Have a brief conversation to make sure it works
    await sendMessage(page, 'Hi there!');
    const messageCount = await countMessages(page);
    expect(messageCount).toBeGreaterThanOrEqual(3); // Welcome + user + AI response

    // Cleanup
    await deleteExercise(page, welcomeSlug);
  });
});

test.describe('Exercise Import/Export', () => {
  let exportSlug: string;
  let importSlug: string;
  const testId = generateTestId();

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up test exercises even if the test fails midway
    for (const slug of [exportSlug, importSlug]) {
      if (slug) {
        try {
          await deleteExercise(page, slug);
        } catch {
          // Exercise may already be deleted or never created
        }
      }
    }
  });

  test('can export exercise JSON and import into another exercise', async ({ page }) => {
    const exerciseName = `Export Source ${testId}`;
    const welcomeMessage = `Welcome to export source ${testId}!`;
    const guidelines = 'Source guidelines for export test.';

    // Create source exercise
    exportSlug = await createExercise(page, {
      name: exerciseName,
      welcomeMessage,
      guidelines,
      maxMessages: 8,
      conversationTask: {
        role: 'Expert',
        prompt: 'Respond as an expert.',
        responseDescription: 'An expert response.',
      },
    });

    // Navigate to edit the exercise
    await goToAdminExercises(page);
    const exerciseRow = page.locator('tr').filter({ hasText: `/${exportSlug}` });
    await exerciseRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('h2').filter({ hasText: 'Edit Exercise' })).toBeVisible();

    // Click Export JSON
    await page.getByRole('button', { name: 'Export JSON' }).click();
    await expect(page.getByText('Export Exercise')).toBeVisible();

    // Get the exported JSON from the readonly textarea
    const exportTextarea = page.locator('.downpat-export-textarea');
    const exportedJson = await exportTextarea.inputValue();
    expect(exportedJson).toContain(exerciseName);
    expect(exportedJson).toContain(welcomeMessage);

    // Close export modal
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Export Exercise')).not.toBeVisible();

    // Create a new exercise to import into
    const importName = `Import Target ${testId}`;
    importSlug = await createExercise(page, {
      name: importName,
      welcomeMessage: 'Placeholder welcome.',
      guidelines: 'Placeholder guidelines.',
      maxMessages: 5,
      conversationTask: {
        role: 'Placeholder',
        prompt: 'Placeholder prompt.',
        responseDescription: 'Placeholder response.',
      },
    });

    // Navigate to edit the import target exercise
    await goToAdminExercises(page);
    const importRow = page.locator('tr').filter({ hasText: `/${importSlug}` });
    await importRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('h2').filter({ hasText: 'Edit Exercise' })).toBeVisible();

    // Click Import JSON
    await page.getByRole('button', { name: 'Import JSON' }).click();
    await expect(page.getByText('Import Exercise')).toBeVisible();

    // Paste the exported JSON
    await page.getByPlaceholder('Paste exported exercise JSON here...').fill(exportedJson);

    // Click Import button
    await page.locator('.downpat-modal-actions').getByRole('button', { name: 'Import' }).click();

    // Modal should close
    await expect(page.getByText('Import Exercise')).not.toBeVisible();

    // Verify form fields now match the exported exercise
    await expect(page.getByPlaceholder('Enter exercise name')).toHaveValue(exerciseName);
    await expect(page.getByPlaceholder('Message shown when conversation starts...')).toHaveValue(welcomeMessage);
    await expect(page.getByPlaceholder('Shared guidelines for coaching tasks...')).toHaveValue(guidelines);
    await expect(page.getByPlaceholder('Who is the user talking to?')).toHaveValue('Expert');
    await expect(page.getByPlaceholder('Instructions for the AI during conversation...')).toHaveValue('Respond as an expert.');

    // Slug should NOT have changed (preserved from import target)
    await expect(page.getByPlaceholder('exercise-slug')).toHaveValue(importSlug);
  });
});
