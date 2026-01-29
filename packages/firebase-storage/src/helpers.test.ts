import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase-admin modules
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  cert: vi.fn((input) => ({ type: 'cert', input })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
}));

// Mock @downpat/core
vi.mock('@downpat/core', () => ({
  createInMemoryStorage: vi.fn(() => ({
    exerciseStorage: { type: 'in-memory-exercise' },
    conversationStorage: { type: 'in-memory-conversation' },
  })),
}));

// Import after mocks
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createInMemoryStorage } from '@downpat/core';
import { initializeFirebaseFromEnv, createFirebaseStorage } from './helpers.js';

describe('initializeFirebaseFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset getApps to return empty array (no existing apps)
    vi.mocked(getApps).mockReturnValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw if FIREBASE_PROJECT_ID is not set', () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    expect(() => initializeFirebaseFromEnv()).toThrow('Firebase project ID is required');
  });

  it('should throw if no credentials are provided', () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    expect(() => initializeFirebaseFromEnv()).toThrow('Firebase credentials are required');
  });

  it('should initialize with GOOGLE_APPLICATION_CREDENTIALS', () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';

    const result = initializeFirebaseFromEnv();

    expect(cert).toHaveBeenCalledWith('/path/to/credentials.json');
    expect(initializeApp).toHaveBeenCalledWith({
      credential: { type: 'cert', input: '/path/to/credentials.json' },
      projectId: 'test-project',
    });
    expect(result).toEqual({ type: 'firestore' });
  });

  it('should initialize with FIREBASE_SERVICE_ACCOUNT_BASE64', () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    const serviceAccount = { project_id: 'test', client_email: 'test@test.iam.gserviceaccount.com' };
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify(serviceAccount)).toString('base64');

    const result = initializeFirebaseFromEnv();

    expect(cert).toHaveBeenCalledWith(serviceAccount);
    expect(initializeApp).toHaveBeenCalledWith({
      credential: { type: 'cert', input: serviceAccount },
      projectId: 'test-project',
    });
    expect(result).toEqual({ type: 'firestore' });
  });

  it('should prefer base64 credentials over file path', () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';
    const serviceAccount = { project_id: 'test', client_email: 'test@test.iam.gserviceaccount.com' };
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify(serviceAccount)).toString('base64');

    initializeFirebaseFromEnv();

    // Should use base64, not file path
    expect(cert).toHaveBeenCalledWith(serviceAccount);
  });

  it('should return existing Firestore if already initialized', () => {
    vi.mocked(getApps).mockReturnValue([{ name: '[DEFAULT]' }] as any);

    const result = initializeFirebaseFromEnv();

    expect(initializeApp).not.toHaveBeenCalled();
    expect(getFirestore).toHaveBeenCalled();
    expect(result).toEqual({ type: 'firestore' });
  });

  it('should use explicit options over env vars', () => {
    process.env.FIREBASE_PROJECT_ID = 'env-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/env/path.json';

    initializeFirebaseFromEnv({
      projectId: 'explicit-project',
      credentialsPath: '/explicit/path.json',
    });

    expect(cert).toHaveBeenCalledWith('/explicit/path.json');
    expect(initializeApp).toHaveBeenCalledWith({
      credential: expect.anything(),
      projectId: 'explicit-project',
    });
  });

  it('should throw on invalid base64 credentials', () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = 'not-valid-base64!!!';

    expect(() => initializeFirebaseFromEnv()).toThrow('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64');
  });
});

describe('createFirebaseStorage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.mocked(getApps).mockReturnValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use in-memory storage when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';

    const result = createFirebaseStorage();

    expect(createInMemoryStorage).toHaveBeenCalled();
    expect(result.exerciseStorage).toEqual({ type: 'in-memory-exercise' });
    expect(result.conversationStorage).toEqual({ type: 'in-memory-conversation' });
    expect(result.storageMode).toBe('in-memory');
  });

  it('should use in-memory storage when forceInMemory is true', () => {
    process.env.NODE_ENV = 'production';

    const result = createFirebaseStorage({ forceInMemory: true });

    expect(createInMemoryStorage).toHaveBeenCalled();
    expect(result.exerciseStorage).toEqual({ type: 'in-memory-exercise' });
    expect(result.storageMode).toBe('in-memory');
  });

  it('should use Firebase storage in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json';

    const result = createFirebaseStorage();

    expect(createInMemoryStorage).not.toHaveBeenCalled();
    expect(initializeApp).toHaveBeenCalled();
    expect(result.exerciseStorage).toBeDefined();
    expect(result.conversationStorage).toBeDefined();
    expect(result.storageMode).toBe('firebase');
  });

  it('should use Firebase storage in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json';

    const result = createFirebaseStorage();

    expect(createInMemoryStorage).not.toHaveBeenCalled();
    expect(initializeApp).toHaveBeenCalled();
    expect(result.storageMode).toBe('firebase');
  });

  it('should pass options to initializeFirebaseFromEnv', () => {
    process.env.NODE_ENV = 'production';

    createFirebaseStorage({
      projectId: 'custom-project',
      credentialsPath: '/custom/path.json',
    });

    expect(cert).toHaveBeenCalledWith('/custom/path.json');
    expect(initializeApp).toHaveBeenCalledWith({
      credential: expect.anything(),
      projectId: 'custom-project',
    });
  });

  it('should fallback to in-memory storage when Firebase init fails', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = createFirebaseStorage();

    expect(createInMemoryStorage).toHaveBeenCalled();
    expect(result.storageMode).toBe('in-memory');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Firebase initialization failed')
    );

    warnSpy.mockRestore();
  });

  it('should fallback to in-memory when credentials file is missing', () => {
    process.env.NODE_ENV = 'development';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/nonexistent/path.json';
    vi.mocked(cert).mockImplementation(() => { throw new Error('File not found'); });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = createFirebaseStorage();

    expect(createInMemoryStorage).toHaveBeenCalled();
    expect(result.storageMode).toBe('in-memory');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Data will be lost on server restart')
    );

    warnSpy.mockRestore();
  });
});
