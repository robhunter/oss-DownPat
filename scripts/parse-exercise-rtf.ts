/**
 * RTF Exercise Parser
 * Parses RTF files exported from legacy DownPat system into Exercise format.
 */

import { readFileSync } from 'fs';
import type { Exercise, Starter, Task, ConversationTask, CommentaryTask, SummaryTask } from '@downpat/core';
import { MessageType } from '@downpat/core';

/** Model name mapping from legacy to current */
const MODEL_MAP: Record<string, string> = {
  'GPT-4.1': 'gpt-4',
  'GPT-4': 'gpt-4',
  'GPT-3.5': 'gpt-3.5-turbo',
  'gpt-4.1': 'gpt-4',
  'gpt-4': 'gpt-4',
};

/** Response type mapping */
const RESPONSE_TYPE_MAP: Record<string, MessageType> = {
  conversation: MessageType.CONVERSATION,
  commentary: MessageType.COMMENTARY,
  summary: MessageType.SUMMARY,
};

/**
 * Strip RTF control codes and convert to plain text.
 */
function stripRtf(rtfContent: string): string {
  let text = rtfContent;

  // Remove RTF header/footer
  text = text.replace(/^\{\\rtf1.*?\n/, '');
  text = text.replace(/\{\\fonttbl.*?\}\n?/g, '');
  text = text.replace(/\{\\colortbl.*?\}\n?/g, '');
  text = text.replace(/\}$/s, '');

  // Convert Unicode escapes (\u8212? → —, \u8217? → ', etc.)
  text = text.replace(/\\u(\d+)\?/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

  // Remove RTF formatting codes
  text = text.replace(/\\pard/g, '');
  text = text.replace(/\\qc/g, '');
  text = text.replace(/\\b0?/g, '');
  text = text.replace(/\\fs\d+/g, '');
  text = text.replace(/\\cf\d+/g, '');
  text = text.replace(/\\par\s*/g, '\n');
  text = text.replace(/\\\\/g, '\\');
  text = text.replace(/\\'/g, "'");
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\\\{/g, '{');
  text = text.replace(/\\\}/g, '}');
  text = text.replace(/\\[a-z]+\d*\s?/gi, '');

  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

/**
 * Extract a section from RTF text by header name.
 */
function extractSection(text: string, sectionName: string, nextSections: string[]): string {
  const sectionPattern = new RegExp(`^${sectionName}\\s*$`, 'm');
  const match = text.match(sectionPattern);
  if (!match || match.index === undefined) {
    return '';
  }

  const startIndex = match.index + match[0].length;

  // Find the next section
  let endIndex = text.length;
  for (const next of nextSections) {
    const nextPattern = new RegExp(`^${next}\\s*$`, 'm');
    const nextMatch = text.slice(startIndex).match(nextPattern);
    if (nextMatch && nextMatch.index !== undefined) {
      const possibleEnd = startIndex + nextMatch.index;
      if (possibleEnd < endIndex) {
        endIndex = possibleEnd;
      }
    }
  }

  return text.slice(startIndex, endIndex).trim();
}

/**
 * Parse starters section into Starter objects.
 */
function parseStarters(startersText: string): Starter[] {
  const starters: Starter[] = [];

  // Split by "Starter N" pattern
  const starterBlocks = startersText.split(/^Starter \d+\s*$/m).filter(s => s.trim());

  for (const block of starterBlocks) {
    const starter = parseStarterBlock(block);
    if (starter) {
      starters.push(starter);
    }
  }

  return starters;
}

/**
 * Parse a single starter block.
 */
function parseStarterBlock(block: string): Starter | null {
  const lines = block.trim().split('\n');

  let text = '';
  let context = '';
  const attributes: Record<string, string> = {};

  let currentField = '';
  let attributesStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for field markers
    if (trimmedLine.startsWith('Text:')) {
      currentField = 'text';
      text = trimmedLine.slice(5).trim();
      continue;
    }
    if (trimmedLine.startsWith('Context:')) {
      currentField = 'context';
      context = trimmedLine.slice(8).trim();
      continue;
    }
    if (trimmedLine.startsWith('Attributes:')) {
      attributesStarted = true;
      currentField = 'attributes';
      continue;
    }

    // Parse attribute lines (indented with 2 spaces, contain colon)
    if (attributesStarted && trimmedLine.includes(':')) {
      const colonIndex = trimmedLine.indexOf(':');
      const key = trimmedLine.slice(0, colonIndex).trim();
      let value = trimmedLine.slice(colonIndex + 1).trim();

      // Handle JSON arrays/objects - keep as string for Record<string, string>
      if (value.startsWith('[') || value.startsWith('{')) {
        // Clean up escaped quotes and backslashes for valid JSON
        value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      } else if (value.startsWith('"') && value.endsWith('"')) {
        // Remove surrounding quotes from simple string values
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }

      attributes[key] = value;
      continue;
    }

    // Continue previous field
    if (currentField === 'text' && !attributesStarted) {
      text += ' ' + trimmedLine;
    } else if (currentField === 'context' && !attributesStarted) {
      context += ' ' + trimmedLine;
    }
  }

  // Clean up
  text = text.trim();
  context = context.trim();

  // A starter needs either text or context to be valid
  if (!text && !context) {
    return null;
  }

  return { text, context, attributes };
}

/**
 * Parse tasks section (continuation or completion).
 */
function parseTasks(tasksText: string): Task[] {
  const tasks: Task[] = [];

  // Split by "Task N" pattern
  const taskBlocks = tasksText.split(/^Task \d+\s*$/m).filter(s => s.trim());

  for (let i = 0; i < taskBlocks.length; i++) {
    const task = parseTaskBlock(taskBlocks[i], `task-${i + 1}`);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Parse a single task block.
 */
function parseTaskBlock(block: string, taskId: string): Task | null {
  const lines = block.trim().split('\n');

  let role = '';
  let responseTypeStr = '';
  let prompt = '';
  let inPrompt = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('Role:')) {
      role = trimmedLine.slice(5).trim();
      continue;
    }
    if (trimmedLine.startsWith('Response Type:')) {
      responseTypeStr = trimmedLine.slice(14).trim().toLowerCase();
      continue;
    }
    if (trimmedLine.startsWith('Prompt:')) {
      inPrompt = true;
      prompt = trimmedLine.slice(7).trim();
      continue;
    }

    if (inPrompt) {
      prompt += '\n' + trimmedLine;
    }
  }

  prompt = prompt.trim();

  if (!role || !responseTypeStr || !prompt) {
    return null;
  }

  const responseType = RESPONSE_TYPE_MAP[responseTypeStr];
  if (!responseType) {
    console.warn(`Unknown response type: ${responseTypeStr}`);
    return null;
  }

  // Create appropriate task type based on responseType
  switch (responseType) {
    case MessageType.CONVERSATION:
      return {
        taskId,
        name: 'Conversation',
        responseType: MessageType.CONVERSATION,
        role,
        prompt,
        responseSchema: { conversation: 'The AI response to continue the conversation' },
        messageFilter: { excludeTypes: [MessageType.COMMENTARY, MessageType.SUMMARY] },
        enabled: true,
      } as ConversationTask;

    case MessageType.COMMENTARY:
      return {
        taskId,
        name: 'Commentary',
        responseType: MessageType.COMMENTARY,
        role,
        prompt,
        responseSchema: {
          commentary: 'Coaching feedback on the user\'s response',
          grade: 'A letter grade (A-F) for the user\'s response'
        },
        messageFilter: { excludeTypes: [MessageType.SUMMARY] },
        includeGuidelines: true,
        enabled: true,
      } as CommentaryTask;

    case MessageType.SUMMARY:
      return {
        taskId,
        name: 'Summary',
        responseType: MessageType.SUMMARY,
        role,
        prompt,
        responseSchema: {
          summary: 'A summary of the conversation and feedback',
          grade: 'A letter grade (A-F) for overall performance'
        },
        messageFilter: {},
        includeGuidelines: true,
        enabled: true,
      } as SummaryTask;

    default:
      return null;
  }
}

/**
 * Generate a URL-friendly slug from exercise name.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Parse an RTF file into an Exercise object.
 */
export function parseExerciseRtf(filePath: string): Omit<Exercise, 'exerciseId' | 'createdAt' | 'updatedAt'> {
  const rtfContent = readFileSync(filePath, 'utf-8');
  const plainText = stripRtf(rtfContent);

  // Section order for extraction
  const allSections = [
    'Exercise Details',
    'Exercise Name',
    'Model',
    'Welcome Message',
    'Guidelines',
    'Starters',
    'Continuation Tasks',
    'Completion Tasks',
  ];

  // Extract each section
  const exerciseName = extractSection(plainText, 'Exercise Name', allSections.slice(2));
  const modelRaw = extractSection(plainText, 'Model', allSections.slice(3));
  const welcomeMessage = extractSection(plainText, 'Welcome Message', allSections.slice(4));
  const guidelines = extractSection(plainText, 'Guidelines', allSections.slice(5));
  const startersText = extractSection(plainText, 'Starters', allSections.slice(6));
  const continuationText = extractSection(plainText, 'Continuation Tasks', allSections.slice(7));
  const completionText = extractSection(plainText, 'Completion Tasks', []);

  // Map model name
  const model = MODEL_MAP[modelRaw.trim()] || 'gpt-4';

  // Parse starters and tasks
  const starters = parseStarters(startersText);
  const continuationTasks = parseTasks(continuationText);
  const completionTasks = parseTasks(completionText);

  return {
    exerciseName: exerciseName.trim(),
    slug: slugify(exerciseName),
    model,
    maxUserMessages: 10,
    talkToCoachEnabled: false,
    welcomeMessage: welcomeMessage.trim(),
    guidelines: guidelines.trim(),
    starters,
    continuationTasks,
    completionTasks,
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/parse-exercise-rtf.ts <rtf-file>');
    process.exit(1);
  }

  const exercise = parseExerciseRtf(filePath);
  console.log(JSON.stringify(exercise, null, 2));
}
