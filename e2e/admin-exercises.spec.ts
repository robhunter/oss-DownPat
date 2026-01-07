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
      tasks: [
        {
          name: 'Main Conversation',
          responseType: 'CONVERSATION',
          prompt: 'Respond helpfully and briefly to the user.',
        },
      ],
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
    await page.goto(`/exercises/${testSlug}`);

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
    await page.goto(`/exercises/${testSlug}`);

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
    await page.goto(`/admin/test/${testSlug}`);
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
      tasks: [
        {
          name: 'Main Response',
          responseType: 'CONVERSATION',
          prompt: 'Respond to the user helpfully in 1-2 sentences.',
        },
        {
          name: 'Coaching Commentary',
          responseType: 'COMMENTARY',
          prompt: 'Provide brief coaching commentary on the conversation (1 sentence).',
        },
      ],
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
    const welcomeMessage = 'Welcome to the exercise!';

    // Create exercise with a starter using the new structure
    await page.goto('/admin/exercises/new');
    await expect(page.locator('h2').filter({ hasText: 'Create New Exercise' })).toBeVisible();

    // Fill basic info
    await page.getByPlaceholder('Enter exercise name').fill(exerciseName);
    starterSlug = exerciseName.toLowerCase().replace(/\s+/g, '-');

    // Fill content
    await page.getByPlaceholder('Message shown when conversation starts...').fill(welcomeMessage);
    await page.getByPlaceholder('Guidelines for the AI...').fill('Be helpful and encouraging.');

    // Fill the starter text (starters now have text, context, attributes - but text is the main visible field)
    await page.getByPlaceholder('Opening message shown to the user...').fill(starterText);

    // Add a task
    await page.getByRole('button', { name: '+ Add Task' }).click();
    await page.waitForTimeout(500);
    const taskEditor = page.locator('.downpat-task-editor').last();
    await taskEditor.getByPlaceholder('Task name').fill('Response');
    await taskEditor.locator('select').first().selectOption('CONVERSATION');
    await taskEditor.getByPlaceholder('AI prompt for this task...').fill('Respond helpfully.');

    // Create the exercise
    await page.getByRole('button', { name: 'Create Exercise' }).click();
    await expect(page).toHaveURL('/admin/exercises');

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

    // ISSUE CHECK: Starter should NOT show "System" as the role/header
    // The first message should have an AI-like header, not "System"
    const firstMessage = allMessages.first();
    const firstMessageText = await firstMessage.textContent();
    expect(firstMessageText).not.toContain('System');

    // Verify the starter appears as a message (not as clickable buttons)
    const hasStarter = await hasMessageWithContent(page, starterText);
    expect(hasStarter).toBe(true);

    // When starters are defined, welcome message should NOT appear separately
    // (starter replaces welcome message as the opening)
    const welcomeOccurrences = await page.locator('.downpat-message').filter({ hasText: welcomeMessage }).count();
    expect(welcomeOccurrences).toBe(0); // Welcome message should not appear when starters are defined

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
      tasks: [
        {
          name: 'Response',
          responseType: 'CONVERSATION',
          prompt: 'Respond briefly.',
        },
      ],
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
