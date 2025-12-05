/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { ToastProvider } from '../components/Toast';

// Mock the useApi module
vi.mock('../hooks/useApi', () => ({
  getUsage: vi.fn(),
  getRuns: vi.fn(),
  exportRunAsZip: vi.fn(),
  exportRunAsMarkdown: vi.fn(),
  getRunSummary: vi.fn(),
  downloadBlob: vi.fn(),
}));

import { getUsage, getRuns } from '../hooks/useApi';

const mockUsage = {
  openai_input_tokens: 1000,
  openai_output_tokens: 500,
  gemini_input_tokens: 200,
  gemini_output_tokens: 100,
  tavily_searches: 5,
  estimated_cost_usd: 0.25,
};

const mockRuns = {
  runs: [
    { component: 'test-component', timestamp: '2024-01-01_12-00-00', path: '/path/to/run' },
  ],
};

function renderDashboard() {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </BrowserRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUsage as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);
    (getRuns as ReturnType<typeof vi.fn>).mockResolvedValue(mockRuns);
  });

  it('renders without crashing', async () => {
    renderDashboard();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview of your research orchestrator activity')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderDashboard();
    
    // Should show loading skeletons (animated pulse divs)
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays stats after loading', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Total Runs')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('Tavily Searches')).toBeInTheDocument();
    expect(screen.getByText('Est. Cost')).toBeInTheDocument();
  });

  it('displays quick action buttons', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('New Research Run')).toBeInTheDocument();
    });
    
    expect(screen.getByText('View All Results')).toBeInTheDocument();
  });

  it('calls API functions on mount', async () => {
    renderDashboard();
    
    await waitFor(() => {
      // May be called multiple times due to React StrictMode
      expect(getUsage).toHaveBeenCalled();
      expect(getRuns).toHaveBeenCalled();
    });
  });
});
