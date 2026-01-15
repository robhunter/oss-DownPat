import { describe, it, expect } from 'vitest';
import { DownpatAPIError, AdminAPIError } from './errors.js';

describe('DownpatAPIError', () => {
  it('should create error with message and status', () => {
    const error = new DownpatAPIError({
      message: 'Not found',
      status: 404,
    });

    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('DownpatAPIError');
  });

  it('should include optional code and details', () => {
    const error = new DownpatAPIError({
      message: 'Validation failed',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { field: 'email', reason: 'Invalid format' },
    });

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'email', reason: 'Invalid format' });
  });

  describe('helper methods', () => {
    it('isNotFound should detect 404 status', () => {
      const error = new DownpatAPIError({ message: 'Not found', status: 404 });
      expect(error.isNotFound()).toBe(true);
      expect(error.isUnauthorized()).toBe(false);
    });

    it('isUnauthorized should detect 401 status', () => {
      const error = new DownpatAPIError({ message: 'Unauthorized', status: 401 });
      expect(error.isUnauthorized()).toBe(true);
      expect(error.isForbidden()).toBe(false);
    });

    it('isForbidden should detect 403 status', () => {
      const error = new DownpatAPIError({ message: 'Forbidden', status: 403 });
      expect(error.isForbidden()).toBe(true);
      expect(error.isUnauthorized()).toBe(false);
    });

    it('isValidationError should detect 400 and 422 status', () => {
      const error400 = new DownpatAPIError({ message: 'Bad request', status: 400 });
      const error422 = new DownpatAPIError({ message: 'Unprocessable', status: 422 });
      const error404 = new DownpatAPIError({ message: 'Not found', status: 404 });

      expect(error400.isValidationError()).toBe(true);
      expect(error422.isValidationError()).toBe(true);
      expect(error404.isValidationError()).toBe(false);
    });

    it('isStatus should check for specific status codes', () => {
      const error = new DownpatAPIError({ message: 'Error', status: 503 });
      expect(error.isStatus(503)).toBe(true);
      expect(error.isStatus(500)).toBe(false);
    });
  });

  describe('instanceof checks', () => {
    it('should be an instance of Error', () => {
      const error = new DownpatAPIError({ message: 'Test', status: 500 });
      expect(error).toBeInstanceOf(Error);
    });

    it('should be catchable as Error', () => {
      try {
        throw new DownpatAPIError({ message: 'Test', status: 500 });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(DownpatAPIError);
      }
    });
  });
});

describe('AdminAPIError alias', () => {
  it('should be the same as DownpatAPIError', () => {
    expect(AdminAPIError).toBe(DownpatAPIError);
  });

  it('should create instances that are DownpatAPIError', () => {
    const error = new AdminAPIError({ message: 'Test', status: 400 });
    expect(error).toBeInstanceOf(DownpatAPIError);
  });
});
