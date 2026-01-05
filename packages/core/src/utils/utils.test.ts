import { describe, it, expect } from 'vitest';
import { generateId, generateSlug } from './index.js';

describe('generateId', () => {
  it('generates a unique ID', () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('generates IDs of consistent format', () => {
    const id = generateId();
    // UUID format or similar unique identifier
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('generateSlug', () => {
  it('converts to lowercase', () => {
    const slug = generateSlug('Test Exercise');
    expect(slug).toBe('test-exercise');
  });

  it('replaces spaces with hyphens', () => {
    const slug = generateSlug('My New Exercise');
    expect(slug).toBe('my-new-exercise');
  });

  it('removes special characters', () => {
    const slug = generateSlug('Test! Exercise? #1');
    expect(slug).toBe('test-exercise-1');
  });

  it('handles multiple spaces', () => {
    const slug = generateSlug('Test   Exercise');
    expect(slug).toBe('test-exercise');
  });

  it('trims leading and trailing spaces', () => {
    const slug = generateSlug('  Test Exercise  ');
    expect(slug).toBe('test-exercise');
  });

  it('handles empty string', () => {
    const slug = generateSlug('');
    expect(slug).toBe('');
  });
});
