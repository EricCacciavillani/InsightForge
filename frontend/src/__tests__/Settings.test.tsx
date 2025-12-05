/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
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
  getHooks: vi.fn(),
  toggleHook: vi.fn(),
}));

import { getConfig, updateSettings, sendTestEmail, checkHealth, getHooks, toggleHook } from '../hooks/useApi';

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
    (getHooks as ReturnType<typeof vi.fn>).mockResolvedValue({ hooks: [{ id: 'auto-commit-file-save', name: 'Auto-Commit on File Save', enabled: false }] });
    (toggleHook as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'auto-commit-file-save', enabled: true, message: 'Hook enabled' });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', async () => {
    const { container } = renderSettings();
    
    expect(container.textContent).toContain('Settings');
    expect(container.textContent).toContain('Configure your orchestrator preferences');
  });

  it('displays section navigation', async () => {
    renderSettings();
    
    // Use getAllByText since these appear in both nav and content
    expect(screen.getAllByText('API Keys').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Email Notifications').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Model Routing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Deep Research').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Advanced').length).toBeGreaterThanOrEqual(1);
  });

  it('shows API key status after loading', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getAllByText('OpenAI API Key').length).toBeGreaterThanOrEqual(1);
    });
    
    // OpenAI is configured
    expect(screen.getAllByText(/Configured \(sk-\.\.\.xxxx\)/).length).toBeGreaterThanOrEqual(1);
    
    // Gemini is not configured
    expect(screen.getAllByText('Gemini API Key').length).toBeGreaterThanOrEqual(1);
  });

  it('has save button', async () => {
    renderSettings();
    
    // Wait for the component to finish loading and health check to complete
    await waitFor(() => {
      // The button text depends on online status - look for either variant
      const saveButtons = screen.getAllByRole('button', { name: /Save Changes|Queue Save/i });
      expect(saveButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('calls updateSettings when save is clicked', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getAllByText('OpenAI API Key').length).toBeGreaterThanOrEqual(1);
    });
    
    // The button text depends on online status - look for either variant
    const saveButtons = screen.getAllByRole('button', { name: /Save Changes|Queue Save/i });
    fireEvent.click(saveButtons[0]);
    
    // When online, updateSettings is called; when offline, action is queued
    // Since checkHealth is mocked to return true, it should call updateSettings
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalled();
    });
  });

  it('switches between sections', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getAllByText('OpenAI API Key').length).toBeGreaterThanOrEqual(1);
    });
    
    // Click on Deep Research section
    const deepResearchNav = screen.getAllByText('Deep Research')[0];
    fireEvent.click(deepResearchNav);
    
    await waitFor(() => {
      expect(screen.getAllByText('Enable Deep Research').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows email section when clicked', async () => {
    renderSettings();
    
    await waitFor(() => {
      expect(screen.getAllByText('OpenAI API Key').length).toBeGreaterThanOrEqual(1);
    });
    
    // Click on Email Notifications section
    const emailNav = screen.getAllByText('Email Notifications')[0];
    fireEvent.click(emailNav);
    
    await waitFor(() => {
      expect(screen.getAllByText('Enable Email Notifications').length).toBeGreaterThanOrEqual(1);
    });
  });
});
