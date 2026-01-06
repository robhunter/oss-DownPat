import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideDownPatToken, getDownPatToken, clearDownPatToken } from './token.js';

describe('Token utilities', () => {
  beforeEach(() => {
    // Clear any existing token
    clearDownPatToken();
    // Clear localStorage
    localStorage.clear();
  });

  describe('provideDownPatToken', () => {
    it('stores token in localStorage', () => {
      provideDownPatToken('test-token');
      expect(localStorage.getItem('downpat_token')).toBe('test-token');
    });

    it('clears token when null is passed', () => {
      provideDownPatToken('test-token');
      provideDownPatToken(null);
      expect(localStorage.getItem('downpat_token')).toBeNull();
    });

    it('overwrites existing token', () => {
      provideDownPatToken('token-1');
      provideDownPatToken('token-2');
      expect(localStorage.getItem('downpat_token')).toBe('token-2');
    });

    it('treats undefined as null (clears token)', () => {
      provideDownPatToken('test-token');
      provideDownPatToken(undefined);
      expect(localStorage.getItem('downpat_token')).toBeNull();
      expect(getDownPatToken()).toBeNull();
    });
  });

  describe('getDownPatToken', () => {
    it('returns null when no token is set', () => {
      expect(getDownPatToken()).toBeNull();
    });

    it('returns token from localStorage', () => {
      localStorage.setItem('downpat_token', 'stored-token');
      expect(getDownPatToken()).toBe('stored-token');
    });

    it('returns token set via provideDownPatToken', () => {
      provideDownPatToken('provided-token');
      expect(getDownPatToken()).toBe('provided-token');
    });
  });

  describe('clearDownPatToken', () => {
    it('removes token from localStorage', () => {
      provideDownPatToken('test-token');
      clearDownPatToken();
      expect(localStorage.getItem('downpat_token')).toBeNull();
    });

    it('causes getDownPatToken to return null', () => {
      provideDownPatToken('test-token');
      clearDownPatToken();
      expect(getDownPatToken()).toBeNull();
    });
  });

  describe('memory fallback', () => {
    it('works when localStorage throws', () => {
      // Mock localStorage to throw
      const originalGetItem = localStorage.getItem;
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });

      // Should still work via memory
      provideDownPatToken('memory-token');
      expect(getDownPatToken()).toBe('memory-token');

      clearDownPatToken();
      expect(getDownPatToken()).toBeNull();

      // Restore
      vi.restoreAllMocks();
    });
  });
});
