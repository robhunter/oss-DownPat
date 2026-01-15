import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// Mock ui-components token functions
vi.mock('@downpat/ui-components', () => ({
  provideDownPatToken: vi.fn(),
  clearDownPatToken: vi.fn(),
}));

// Mock the DownpatClient
vi.mock('./DownpatClient.js', () => ({
  createDownpatClient: vi.fn(() => ({
    getPublishedExercises: vi.fn(),
    getExercisesWithMetadata: vi.fn(),
  })),
}));

import { provideDownPatToken, clearDownPatToken } from '@downpat/ui-components';
import { createDownpatClient } from './DownpatClient.js';
import {
  DownpatProvider,
  useDownpatClient,
  useDownpatToken,
  useHasDownpatContext,
} from './DownpatContext.js';

// Test component that uses the client
function ClientConsumer() {
  const client = useDownpatClient();
  return <div data-testid="client">{client ? 'has-client' : 'no-client'}</div>;
}

// Test component that uses token update
function TokenUpdater({ onUpdate }: { onUpdate?: (fn: (token: string | null) => void) => void }) {
  const updateToken = useDownpatToken();
  React.useEffect(() => {
    onUpdate?.(updateToken);
  }, [updateToken, onUpdate]);
  return <div data-testid="token-updater">ready</div>;
}

// Test component that checks context availability
function ContextChecker() {
  const hasContext = useHasDownpatContext();
  return <div data-testid="has-context">{hasContext ? 'yes' : 'no'}</div>;
}

describe('DownpatProvider', () => {
  const mockGetToken = vi.fn(() => 'test-token');

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide client to children', () => {
    render(
      <DownpatProvider getToken={mockGetToken}>
        <ClientConsumer />
      </DownpatProvider>
    );

    expect(screen.getByTestId('client')).toHaveTextContent('has-client');
  });

  it('should create client with config', () => {
    render(
      <DownpatProvider getToken={mockGetToken} baseUrl="/custom/api">
        <ClientConsumer />
      </DownpatProvider>
    );

    // Client should be created with the baseUrl and a getToken function
    // Note: getToken is wrapped in a stable ref, so we check it's a function
    // that returns the expected value rather than checking identity
    expect(createDownpatClient).toHaveBeenCalledWith({
      baseUrl: '/custom/api',
      getToken: expect.any(Function),
    });

    // Verify the wrapped getToken returns the expected value
    const callArgs = (createDownpatClient as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.getToken()).toBe('test-token');
  });

  it('should provide token to Socket.io on mount', () => {
    mockGetToken.mockReturnValue('initial-token');

    render(
      <DownpatProvider getToken={mockGetToken}>
        <div>App</div>
      </DownpatProvider>
    );

    expect(provideDownPatToken).toHaveBeenCalledWith('initial-token');
  });

  it('should clear token on unmount', () => {
    const { unmount } = render(
      <DownpatProvider getToken={mockGetToken}>
        <div>App</div>
      </DownpatProvider>
    );

    unmount();

    expect(clearDownPatToken).toHaveBeenCalled();
  });

  it('should handle null token on mount', () => {
    mockGetToken.mockReturnValue(null);

    render(
      <DownpatProvider getToken={mockGetToken}>
        <div>App</div>
      </DownpatProvider>
    );

    expect(provideDownPatToken).not.toHaveBeenCalled();
  });

  it('should update token when prop changes', () => {
    const { rerender } = render(
      <DownpatProvider getToken={mockGetToken} token="token-1">
        <div>App</div>
      </DownpatProvider>
    );

    expect(provideDownPatToken).toHaveBeenCalledWith('token-1');

    vi.clearAllMocks();

    rerender(
      <DownpatProvider getToken={mockGetToken} token="token-2">
        <div>App</div>
      </DownpatProvider>
    );

    expect(provideDownPatToken).toHaveBeenCalledWith('token-2');
  });
});

describe('useDownpatClient', () => {
  it('should throw when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ClientConsumer />);
    }).toThrow('useDownpatClient must be used within a DownpatProvider');

    consoleSpy.mockRestore();
  });

  it('should return client from context', () => {
    const mockGetToken = vi.fn(() => 'token');

    render(
      <DownpatProvider getToken={mockGetToken}>
        <ClientConsumer />
      </DownpatProvider>
    );

    expect(screen.getByTestId('client')).toHaveTextContent('has-client');
  });
});

describe('useDownpatToken', () => {
  it('should throw when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TokenUpdater />);
    }).toThrow('useDownpatToken must be used within a DownpatProvider');

    consoleSpy.mockRestore();
  });

  it('should return updateToken function', () => {
    const mockGetToken = vi.fn(() => 'token');
    let capturedUpdateFn: ((token: string | null) => void) | undefined;

    render(
      <DownpatProvider getToken={mockGetToken}>
        <TokenUpdater onUpdate={(fn) => { capturedUpdateFn = fn; }} />
      </DownpatProvider>
    );

    expect(capturedUpdateFn).toBeDefined();
    expect(typeof capturedUpdateFn).toBe('function');
  });

  it('should update token when called', () => {
    const mockGetToken = vi.fn(() => 'token');
    let capturedUpdateFn: ((token: string | null) => void) | undefined;

    render(
      <DownpatProvider getToken={mockGetToken}>
        <TokenUpdater onUpdate={(fn) => { capturedUpdateFn = fn; }} />
      </DownpatProvider>
    );

    vi.clearAllMocks();

    act(() => {
      capturedUpdateFn?.('new-token');
    });

    expect(provideDownPatToken).toHaveBeenCalledWith('new-token');
  });

  it('should clear token when called with null', () => {
    const mockGetToken = vi.fn(() => 'token');
    let capturedUpdateFn: ((token: string | null) => void) | undefined;

    render(
      <DownpatProvider getToken={mockGetToken}>
        <TokenUpdater onUpdate={(fn) => { capturedUpdateFn = fn; }} />
      </DownpatProvider>
    );

    vi.clearAllMocks();

    act(() => {
      capturedUpdateFn?.(null);
    });

    expect(clearDownPatToken).toHaveBeenCalled();
  });
});

describe('useHasDownpatContext', () => {
  it('should return false outside provider', () => {
    render(<ContextChecker />);

    expect(screen.getByTestId('has-context')).toHaveTextContent('no');
  });

  it('should return true inside provider', () => {
    const mockGetToken = vi.fn(() => 'token');

    render(
      <DownpatProvider getToken={mockGetToken}>
        <ContextChecker />
      </DownpatProvider>
    );

    expect(screen.getByTestId('has-context')).toHaveTextContent('yes');
  });
});
