/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RunOrchestrator from '../../pages/RunOrchestrator';
import { ToastProvider } from '../../components/Toast';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket
let mockWebSocket: {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((error: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
};
let WebSocketSpy: ReturnType<typeof vi.fn>;

// Mock OfflineContext to always return online
vi.mock('../../contexts/OfflineContext', () => ({
  useOffline: () => ({
    isOnline: true,
    queuedActions: [],
    queueAction: vi.fn(),
    clearQueue: vi.fn(),
    isRetrying: false,
  }),
  OfflineProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderWithProviders(component: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        {component}
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Run Orchestrator Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup WebSocket mock
    mockWebSocket = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    };
    WebSocketSpy = vi.fn(() => mockWebSocket);
    global.WebSocket = WebSocketSpy as unknown as typeof WebSocket;
    
    // Default fetch mock for /run endpoint
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'started', components: ['test-component'] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the run orchestrator page with input fields', () => {
    renderWithProviders(<RunOrchestrator />);
    
    expect(screen.getByText('Run Orchestrator')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\., AURORA/)).toBeInTheDocument();
    expect(screen.getByText('Start Research Run')).toBeInTheDocument();
  });

  it('shows disconnected status initially before WebSocket connects', () => {
    renderWithProviders(<RunOrchestrator />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows connected status after WebSocket opens', async () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Simulate WebSocket connection
    await act(async () => {
      mockWebSocket.onopen?.();
    });
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('allows adding and removing components', () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Initially one input
    const inputs = screen.getAllByPlaceholderText(/e\.g\., AURORA/);
    expect(inputs).toHaveLength(1);
    
    // Add another component
    fireEvent.click(screen.getByText('Add another component'));
    
    const updatedInputs = screen.getAllByPlaceholderText(/e\.g\., AURORA/);
    expect(updatedInputs).toHaveLength(2);
  });

  it('disables start button when no components entered', () => {
    renderWithProviders(<RunOrchestrator />);
    
    const startButton = screen.getByText('Start Research Run');
    expect(startButton.closest('button')).toBeDisabled();
  });

  it('enables start button when component is entered', () => {
    renderWithProviders(<RunOrchestrator />);
    
    const input = screen.getByPlaceholderText(/e\.g\., AURORA/);
    fireEvent.change(input, { target: { value: 'test-component' } });
    
    const startButton = screen.getByText('Start Research Run');
    expect(startButton.closest('button')).not.toBeDisabled();
  });

  it('starts a run and calls the API', async () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Enter component
    const input = screen.getByPlaceholderText(/e\.g\., AURORA/);
    fireEvent.change(input, { target: { value: 'test-component' } });
    
    // Start run
    await act(async () => {
      fireEvent.click(screen.getByText('Start Research Run'));
    });
    
    // Verify API was called
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8742/run',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ components: ['test-component'] }),
      })
    );
  });

  it('receives and displays log messages via WebSocket', async () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Connect WebSocket
    await act(async () => {
      mockWebSocket.onopen?.();
    });
    
    // Simulate run_started message
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'run_started', components: ['test-component'] }),
      });
    });
    
    expect(screen.getByText('[System] Starting orchestrator run...')).toBeInTheDocument();
    
    // Simulate log message
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'log', message: 'Processing component: test-component' }),
      });
    });
    
    expect(screen.getByText('Processing component: test-component')).toBeInTheDocument();
  });

  it('shows component completion via WebSocket', async () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Connect WebSocket
    await act(async () => {
      mockWebSocket.onopen?.();
    });
    
    // Simulate component_complete message
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ 
          type: 'component_complete', 
          component: 'test-component',
          nodes: 5 
        }),
      });
    });
    
    expect(screen.getByText('✅ Component complete: test-component (5 nodes)')).toBeInTheDocument();
  });

  it('shows run completion with cost estimate', async () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Connect WebSocket
    await act(async () => {
      mockWebSocket.onopen?.();
    });
    
    // Simulate run_complete message with usage
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ 
          type: 'run_complete',
          usage: {
            openai_tokens: 1000,
            gemini_tokens: 500,
            tavily_searches: 2,
            estimated_cost: 0.0125
          }
        }),
      });
    });
    
    expect(screen.getByText('✅ Run complete!')).toBeInTheDocument();
    expect(screen.getByText('$0.0125')).toBeInTheDocument();
  });

  it('handles run error via WebSocket', async () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Connect WebSocket
    await act(async () => {
      mockWebSocket.onopen?.();
    });
    
    // Simulate run_error message
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ 
          type: 'run_error',
          error: 'API rate limit exceeded'
        }),
      });
    });
    
    expect(screen.getByText('❌ Error: API rate limit exceeded')).toBeInTheDocument();
  });

  it('handles API failure when starting run', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Backend unavailable' }),
    });
    
    renderWithProviders(<RunOrchestrator />);
    
    // Enter component
    const input = screen.getByPlaceholderText(/e\.g\., AURORA/);
    fireEvent.change(input, { target: { value: 'test-component' } });
    
    // Start run
    await act(async () => {
      fireEvent.click(screen.getByText('Start Research Run'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('❌ Failed to start run: Backend unavailable')).toBeInTheDocument();
    });
  });

  it('completes full flow: start -> logs -> component complete -> run complete', async () => {
    renderWithProviders(<RunOrchestrator />);
    
    // Connect WebSocket
    await act(async () => {
      mockWebSocket.onopen?.();
    });
    
    // Enter component and start run
    const input = screen.getByPlaceholderText(/e\.g\., AURORA/);
    fireEvent.change(input, { target: { value: 'neural-interface' } });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Start Research Run'));
    });
    
    // Wait for API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    
    // Simulate full WebSocket flow
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'run_started', components: ['neural-interface'] }),
      });
    });
    
    expect(screen.getByText('[System] Starting orchestrator run...')).toBeInTheDocument();
    
    // Log messages
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'log', message: 'Decomposing component...' }),
      });
    });
    
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'log', message: 'Running research agents...' }),
      });
    });
    
    expect(screen.getByText('Decomposing component...')).toBeInTheDocument();
    expect(screen.getByText('Running research agents...')).toBeInTheDocument();
    
    // Component complete
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ 
          type: 'component_complete', 
          component: 'neural-interface',
          nodes: 8 
        }),
      });
    });
    
    expect(screen.getByText('✅ Component complete: neural-interface (8 nodes)')).toBeInTheDocument();
    
    // Run complete with cost
    await act(async () => {
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ 
          type: 'run_complete',
          usage: {
            openai_tokens: 5000,
            gemini_tokens: 3000,
            tavily_searches: 5,
            estimated_cost: 0.0875
          }
        }),
      });
    });
    
    expect(screen.getByText('✅ Run complete!')).toBeInTheDocument();
    expect(screen.getByText('$0.0875')).toBeInTheDocument();
  });
});
