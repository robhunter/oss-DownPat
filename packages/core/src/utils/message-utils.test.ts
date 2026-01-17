import { describe, it, expect } from 'vitest';
import {
  selectStarter,
  starterToMessages,
  createWelcomeMessage,
  parseStarterContent,
} from './message-utils.js';
import { MessageType } from '../constants/index.js';
import { Starter } from '../types/index.js';

describe('message-utils', () => {
  describe('selectStarter', () => {
    const starters: Starter[] = [
      { text: 'Easy starter', context: 'Easy context', attributes: { difficulty: 'easy' } },
      { text: 'Hard starter', context: 'Hard context', attributes: { difficulty: 'hard' } },
      { text: 'Medium starter', context: 'Medium context', attributes: { difficulty: 'medium' } },
    ];

    it('returns null for empty starters array', () => {
      expect(selectStarter([], {})).toBeNull();
    });

    it('returns null for undefined starters', () => {
      expect(selectStarter(undefined as unknown as Starter[], {})).toBeNull();
    });

    it('returns a random starter when no query params provided', () => {
      const result = selectStarter(starters, {});
      expect(result).not.toBeNull();
      expect(starters).toContain(result);
    });

    it('filters starters by matching query params', () => {
      const result = selectStarter(starters, { difficulty: 'hard' });
      expect(result?.text).toBe('Hard starter');
    });

    it('is case-insensitive for query matching', () => {
      const result = selectStarter(starters, { difficulty: 'EASY' });
      expect(result?.text).toBe('Easy starter');
    });

    it('ignores unrelated query params (like UTM codes)', () => {
      const result = selectStarter(starters, { difficulty: 'medium', utm_source: 'google' });
      expect(result?.text).toBe('Medium starter');
    });

    it('falls back to random starter when no matches found', () => {
      const result = selectStarter(starters, { difficulty: 'impossible' });
      expect(result).not.toBeNull();
      expect(starters).toContain(result);
    });
  });

  describe('starterToMessages', () => {
    it('creates STARTER message from starter without context', () => {
      const starter: Starter = {
        text: 'Hello!',
        context: '',
        attributes: {},
      };

      const messages = starterToMessages(starter);

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe(MessageType.STARTER);
      expect(messages[0].role).toBe('Assistant');
      // Content should be JSON with starter data
      const content = JSON.parse(messages[0].content);
      expect(content.text).toBe('Hello!');
    });

    it('creates CONTEXT and STARTER messages when context exists', () => {
      const starter: Starter = {
        text: 'Hello!',
        context: 'You are in a meeting room.',
        attributes: {},
      };

      const messages = starterToMessages(starter);

      expect(messages).toHaveLength(2);
      // First message is CONTEXT
      expect(messages[0].type).toBe(MessageType.CONTEXT);
      expect(messages[0].content).toBe('You are in a meeting room.');
      // Second message is STARTER
      expect(messages[1].type).toBe(MessageType.STARTER);
    });

    it('uses name attribute as role if provided', () => {
      const starter: Starter = {
        text: 'Hello!',
        context: '',
        attributes: { name: 'Dr. Smith' },
      };

      const messages = starterToMessages(starter);

      expect(messages[0].role).toBe('Dr. Smith');
    });

    it('includes all attributes in starter content JSON', () => {
      const starter: Starter = {
        text: 'Hello!',
        context: 'Context',
        attributes: { name: 'Bob', topic: 'science', level: 'advanced' },
      };

      const messages = starterToMessages(starter);
      const starterMessage = messages.find(m => m.type === MessageType.STARTER);
      const content = JSON.parse(starterMessage!.content);

      expect(content.name).toBe('Bob');
      expect(content.topic).toBe('science');
      expect(content.level).toBe('advanced');
    });
  });

  describe('createWelcomeMessage', () => {
    it('creates a WELCOME type message with welcome text', () => {
      const message = createWelcomeMessage('Welcome to the exercise!');

      expect(message.type).toBe(MessageType.WELCOME);
      expect(message.role).toBe('System');
      expect(message.content).toBe('Welcome to the exercise!');
      expect(message.messageId).toBeDefined();
      expect(message.timestamp).toBeDefined();
    });
  });

  describe('parseStarterContent', () => {
    it('parses valid JSON starter content', () => {
      const content = JSON.stringify({ text: 'Hello', context: 'Context', name: 'Bob' });
      const result = parseStarterContent(content);

      expect(result).toEqual({ text: 'Hello', context: 'Context', name: 'Bob' });
    });

    it('returns plain text wrapper for non-JSON content (backwards compatibility)', () => {
      const result = parseStarterContent('Just plain text');

      expect(result).toEqual({ text: 'Just plain text' });
    });

    it('handles empty string', () => {
      const result = parseStarterContent('');

      expect(result).toEqual({ text: '' });
    });
  });
});
