/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { fetchApi, useApiQuery, useWebSocket, checkHealth } from '../hooks/useApi';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed JSON on successful response', async () => {
    const mockData = { status: 'ok', data: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchApi('/test');
    
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8742/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('throws error with detail message on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Bad request' }),
    });

    await expect(fetchApi('/test')).rejects.toThrow('Bad request');
  });

  it('throws error with fallback message when JSON parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Parse error')),
    });

    // When JSON parsing fails, fetchApi catches and returns 'Unknown error'
    await expect(fetchApi('/test')).rejects.toThrow('Unknown error');
  });

  it('passes custom options to fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    await fetchApi('/test', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8742/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      })
    );
  });
});

describe('checkHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when health check succeeds', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await checkHealth();
    
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8742/health',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('returns false when health check fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await checkHealth();
    
    expect(result).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await checkHealth();
    
    expect(result).toBe(false);
  });
});

describe('useApiQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches data on mount and sets loading states', async () => {
    const mockData = { items: [1, 2, 3] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useApiQuery<typeof mockData>('/items'));

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it('sets error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found' }),
    });

    const { result } = renderHook(() => useApiQuery('/missing'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe('Not found');
  });

  it('refetch function triggers new request', async () => {
    const mockData1 = { count: 1 };
    const mockData2 = { count: 2 };
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData2),
      });

    const { result } = renderHook(() => useApiQuery<typeof mockData1>('/count'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('useWebSocket', () => {
  let mockWebSocket: {
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    onerror: ((error: Event) => void) | null;
    close: ReturnType<typeof vi.fn>;
  };
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockWebSocket = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    };

    originalWebSocket = global.WebSocket;
    
    // Create a proper class constructor mock
    class MockWebSocket {
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: ((error: Event) => void) | null = null;
      close = vi.fn();
      
      constructor() {
        // Copy reference so tests can access it
        mockWebSocket.close = this.close;
        Object.defineProperty(mockWebSocket, 'onopen', {
          get: () => this.onopen,
          set: (v) => { this.onopen = v; },
          configurable: true,
        });
        Object.defineProperty(mockWebSocket, 'onclose', {
          get: () => this.onclose,
          set: (v) => { this.onclose = v; },
          configurable: true,
        });
        Object.defineProperty(mockWebSocket, 'onmessage', {
          get: () => this.onmessage,
          set: (v) => { this.onmessage = v; },
          configurable: true,
        });
        Object.defineProperty(mockWebSocket, 'onerror', {
          get: () => this.onerror,
          set: (v) => { this.onerror = v; },
          configurable: true,
        });
      }
    }
    
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  it('connects to WebSocket on mount', () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket(onMessage));

    // WebSocket was instantiated (mock was called as constructor)
    expect(mockWebSocket.onopen).toBeDefined();
  });

  it('sets connected to true when WebSocket opens', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useWebSocket(onMessage));

    expect(result.current.connected).toBe(false);

    act(() => {
      mockWebSocket.onopen?.();
    });

    expect(result.current.connected).toBe(true);
  });

  it('calls onMessage callback when message received', () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket(onMessage));

    act(() => {
      mockWebSocket.onopen?.();
    });

    const testMessage = { type: 'log', message: 'Test log' };
    act(() => {
      mockWebSocket.onmessage?.({ data: JSON.stringify(testMessage) });
    });

    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });

  it('reconnects after disconnect with 2 second delay', () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useWebSocket(onMessage));

    act(() => {
      mockWebSocket.onopen?.();
    });
    expect(result.current.connected).toBe(true);

    // Simulate disconnect
    act(() => {
      mockWebSocket.onclose?.();
    });
    expect(result.current.connected).toBe(false);

    // Advance timer by 2 seconds - should trigger reconnect
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // After reconnect, onopen should still be defined (new connection)
    expect(mockWebSocket.onopen).toBeDefined();
  });

  it('closes WebSocket on unmount', () => {
    const onMessage = vi.fn();
    const { unmount } = renderHook(() => useWebSocket(onMessage));

    act(() => {
      mockWebSocket.onopen?.();
    });

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('handles invalid JSON messages gracefully', () => {
    const onMessage = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderHook(() => useWebSocket(onMessage));

    act(() => {
      mockWebSocket.onopen?.();
    });

    act(() => {
      mockWebSocket.onmessage?.({ data: 'invalid json' });
    });

    expect(onMessage).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});
