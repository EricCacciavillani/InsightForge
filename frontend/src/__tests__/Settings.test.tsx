/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
import { ToastProvider } from '../components/Toast';
import { OfflineProvider } from '../contexts/OfflineContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock the useApi module
vi.mock('../hooks/useApi', () => ({
  getConfig: vi.fn(),
  updateSettings: vi.fn(),
  sendTestEmail: vi.fn(),
  checkHealth: vi.fn(),
  fetchApi: vi.fn(),
  exportRunAsZip: vi.fn(),
  exportRunAsMarkdown: vi.fn(),
  getRunSummary: vi.fn(),
  downloadBlob: vi.fn(),
}));

import { getConfig, updateSettings, sendTestEmail, checkHealth } from '../hooks/useApi';

const mockConfig = {
  deep_research_enabled: true,
  deep_research_queries: 5,
  parallel_enabled: true,
  checkpoint_enabled: true,
  model_routing: {},
  api_keys_set: {
    openai: true,
    gemini: false,
    tavily: false,
  },
  api_keys_masked: {
    openai: 'sk-...xxxx',
    gemini: '',
    tavily: '',
  },
  email_settings: {
    enabled: false,
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    email: '',
    password_set: false,
    recipient: '',
    configured: false,
  },
};

function renderSettings() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <OfflineProvider>
            <Settings />
          </OfflineProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
    (updateSettings as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'ok' });
    (sendTestEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'ok', message: 'sent' });
    (checkHealth as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('renders without crashing', async () => {
    renderSettings();
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your orchestrator preferences')).toBeInTheDocument();
  });

  it('displays section navigation', async () => {
    renderSettings();
    
    // Use getAllByText since "API Keys" appears in both nav and content
    expect(screen.getAllByText('API Keys').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Model Routing')).toBeInTheDocument();
    expect(screen.getByText('Deep Research')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('shows API key status after loading', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });
    
    // OpenAI is configured
    expect(screen.getByText(/Configured \(sk-\.\.\.xxxx\)/)).toBeInTheDocument();
    
    // Gemini is not configured
    expect(screen.getByText('Gemini API Key')).toBeInTheDocument();
  });

  it('has save button', async () => {
    renderSettings();
    
    // Wait for the component to finish loading and health check to complete
    await waitFor(() => {
      // The button text depends on online status - look for either variant
      const saveButton = screen.getByRole('button', { name: /Save Changes|Queue Save/i });
      expect(saveButton).toBeInTheDocument();
    });
  });

  it('calls updateSettings when save is clicked', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });
    
    // The button text depends on online status - look for either variant
    const saveButton = screen.getByRole('button', { name: /Save Changes|Queue Save/i });
    fireEvent.click(saveButton);
    
    // When online, updateSettings is called; when offline, action is queued
    // Since checkHealth is mocked to return true, it should call updateSettings
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalled();
    });
  });

  it('switches between sections', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });
    
    // Click on Deep Research section
    const deepResearchNav = screen.getAllByText('Deep Research')[0];
    fireEvent.click(deepResearchNav);
    
    await waitFor(() => {
      expect(screen.getByText('Enable Deep Research')).toBeInTheDocument();
    });
  });

  it('shows email section when clicked', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });
    
    // Click on Email Notifications section
    const emailNav = screen.getAllByText('Email Notifications')[0];
    fireEvent.click(emailNav);
    
    await waitFor(() => {
      expect(screen.getByText('Enable Email Notifications')).toBeInTheDocument();
    });
  });
});
