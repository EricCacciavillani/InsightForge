import { useState, useEffect } from 'react';
import { Save, Key, Cpu, Zap, Database, Loader2, CheckCircle, Mail, Send, Info, ExternalLink, WifiOff, Sun, Moon, Palette, BookOpen, GitCommit } from 'lucide-react';
import { clsx } from 'clsx';
import { getConfig, updateSettings, sendTestEmail, getHooks, toggleHook } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { useOffline } from '../contexts/OfflineContext';
import { useTheme } from '../contexts/ThemeContext';
import { HelpTooltip, helpTexts } from '../components/Tooltip';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ElementType;
}

const sections: SettingSection[] = [
  { id: 'api', title: 'API Keys', icon: Key },
  { id: 'email', title: 'Email Notifications', icon: Mail },
  { id: 'appearance', title: 'Appearance', icon: Palette },
  { id: 'models', title: 'Model Routing', icon: Cpu },
  { id: 'research', title: 'Deep Research', icon: Zap },
  { id: 'advanced', title: 'Advanced', icon: Database },
];

interface ApiKeysStatus {
  openai: boolean;
  gemini: boolean;
  tavily: boolean;
}

interface ApiKeysMasked {
  openai: string;
  gemini: string;
  tavily: string;
}

interface EmailSettings {
  enabled: boolean;
  smtp_server: string;
  smtp_port: number;
  email: string;
  password_set: boolean;
  recipient: string;
  configured: boolean;
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [apiKeysSet, setApiKeysSet] = useState<ApiKeysStatus>({ openai: false, gemini: false, tavily: false });
  const [apiKeysMasked, setApiKeysMasked] = useState<ApiKeysMasked>({ openai: '', gemini: '', tavily: '' });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    enabled: false,
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    email: '',
    password_set: false,
    recipient: '',
    configured: false,
  });
  const toast = useToast();
  const { isOnline, queueAction } = useOffline();
  const { theme, toggleTheme } = useTheme();
  const [autoCommitEnabled, setAutoCommitEnabled] = useState(false);
  const [togglingAutoCommit, setTogglingAutoCommit] = useState(false);
  const [settings, setSettings] = useState({
    openaiKey: '',
    geminiKey: '',
    tavilyKey: '',
    deepResearchEnabled: true,
    deepResearchQueries: 5,
    parallelEnabled: true,
    parallelWorkers: 4,
    checkpointEnabled: true,
    // Email form fields (for new/updated values)
    emailEnabled: false,
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    smtpEmail: '',
    smtpPassword: '',
    emailRecipient: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await getConfig();
      setApiKeysSet(config.api_keys_set);
      setApiKeysMasked(config.api_keys_masked || { openai: '', gemini: '', tavily: '' });
      
      // Load email settings
      if (config.email_settings) {
        setEmailSettings(config.email_settings);
        setSettings(prev => ({
          ...prev,
          emailEnabled: config.email_settings!.enabled,
          smtpServer: config.email_settings!.smtp_server,
          smtpPort: config.email_settings!.smtp_port,
          smtpEmail: config.email_settings!.email,
          emailRecipient: config.email_settings!.recipient,
          // Don't load password - it's not returned from API
        }));
      }
      
      setSettings(prev => ({
        ...prev,
        deepResearchEnabled: config.deep_research_enabled,
        deepResearchQueries: config.deep_research_queries,
        parallelEnabled: config.parallel_enabled,
        checkpointEnabled: config.checkpoint_enabled,
      }));
      
      // Load hook settings
      try {
        const hooksData = await getHooks();
        const autoCommitHook = hooksData.hooks.find(h => h.id === 'auto-commit-file-save');
        if (autoCommitHook) {
          setAutoCommitEnabled(autoCommitHook.enabled);
        }
      } catch (hookErr) {
        console.warn('Failed to load hooks:', hookErr);
      }
    } catch (err) {
      toast.error('Failed to load settings');
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const payload: {
        openai_key?: string;
        gemini_key?: string;
        tavily_key?: string;
        email_enabled?: boolean;
        smtp_server?: string;
        smtp_port?: number;
        smtp_email?: string;
        smtp_password?: string;
        email_recipient?: string;
      } = {};
      
      // API keys
      if (settings.openaiKey) payload.openai_key = settings.openaiKey;
      if (settings.geminiKey) payload.gemini_key = settings.geminiKey;
      if (settings.tavilyKey) payload.tavily_key = settings.tavilyKey;
      
      // Email settings - always include enabled state and other fields if changed
      payload.email_enabled = settings.emailEnabled;
      if (settings.smtpServer) payload.smtp_server = settings.smtpServer;
      if (settings.smtpPort) payload.smtp_port = settings.smtpPort;
      if (settings.smtpEmail) payload.smtp_email = settings.smtpEmail;
      if (settings.smtpPassword) payload.smtp_password = settings.smtpPassword;
      if (settings.emailRecipient) payload.email_recipient = settings.emailRecipient;
      
      // If offline, queue the action for later
      if (!isOnline) {
        queueAction({
          type: 'api_call',
          endpoint: '/settings',
          method: 'POST',
          body: JSON.stringify(payload),
          description: 'Save settings',
        });
        toast.warning('Offline - settings queued for when reconnected');
        setSettings(prev => ({ ...prev, openaiKey: '', geminiKey: '', tavilyKey: '', smtpPassword: '' }));
        setSaving(false);
        return;
      }
      
      await updateSettings(payload);
      toast.success('Settings saved successfully');
      
      // Clear the sensitive input fields and reload config
      setSettings(prev => ({ ...prev, openaiKey: '', geminiKey: '', tavilyKey: '', smtpPassword: '' }));
      await loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      await sendTestEmail();
      toast.success('Test email sent! Check your inbox.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-1">
            Configure your orchestrator preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isOnline && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-500">
              <WifiOff size={14} />
              Offline - will queue
            </span>
          )}
          <a
            href="https://github.com/your-repo/insightforge#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-accent transition-colors"
            title="View full documentation"
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Docs</span>
          </a>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50",
              isOnline 
                ? "bg-accent hover:bg-accent-hover text-white"
                : "bg-yellow-600 hover:bg-yellow-700 text-white"
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : isOnline ? 'Save Changes' : 'Queue Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Nav */}
        <div className="lg:col-span-1">
          <nav className="bg-surface rounded-xl border border-border p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                  activeSection === section.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                <section.icon size={18} />
                <span className="text-sm font-medium">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-3 bg-surface rounded-xl border border-border p-6">
          {activeSection === 'api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">API Keys</h3>
                <p className="text-sm text-text-secondary mb-6">
                  Configure your API keys for LLM providers and search services.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-accent" size={24} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-sm font-medium text-text-primary">
                          OpenAI API Key
                        </label>
                        <HelpTooltip text={helpTexts.openaiKey} position="right" />
                      </div>
                      {apiKeysSet.openai ? (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle size={12} />
                          Configured ({apiKeysMasked.openai})
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-500">Not configured</span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={settings.openaiKey}
                      onChange={(e) => updateSetting('openaiKey', e.target.value)}
                      placeholder={apiKeysSet.openai ? 'Enter new key to update...' : 'sk-...'}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                    <p className="mt-1.5 text-xs text-text-muted">
                      Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">platform.openai.com</a>
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-sm font-medium text-text-primary">
                          Gemini API Key
                        </label>
                        <HelpTooltip text={helpTexts.geminiKey} position="right" />
                      </div>
                      {apiKeysSet.gemini ? (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle size={12} />
                          Configured ({apiKeysMasked.gemini})
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-500">Not configured</span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={settings.geminiKey}
                      onChange={(e) => updateSetting('geminiKey', e.target.value)}
                      placeholder={apiKeysSet.gemini ? 'Enter new key to update...' : 'AI...'}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                    <p className="mt-1.5 text-xs text-text-muted">
                      Get your key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">aistudio.google.com</a>
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-sm font-medium text-text-primary">
                          Tavily API Key
                        </label>
                        <HelpTooltip text={helpTexts.tavilyKey} position="right" />
                      </div>
                      {apiKeysSet.tavily ? (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle size={12} />
                          Configured ({apiKeysMasked.tavily})
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">Optional</span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={settings.tavilyKey}
                      onChange={(e) => updateSetting('tavilyKey', e.target.value)}
                      placeholder={apiKeysSet.tavily ? 'Enter new key to update...' : 'tvly-...'}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                    <p className="mt-1.5 text-xs text-text-muted">
                      Get a free key at <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">tavily.com</a> for deep research capabilities
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Email Notifications</h3>
                <p className="text-sm text-text-secondary mb-6">
                  Receive email notifications when components complete and when runs finish.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-accent" size={24} />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-text-primary">Enable Email Notifications</p>
                        <HelpTooltip text={helpTexts.emailNotifications} position="right" />
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Send emails when research runs complete
                      </p>
                    </div>
                    <button
                      onClick={() => updateSetting('emailEnabled', !settings.emailEnabled)}
                      className={clsx(
                        'w-12 h-6 rounded-full transition-colors relative',
                        settings.emailEnabled ? 'bg-accent' : 'bg-surface-active'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          settings.emailEnabled ? 'translate-x-7' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  {/* Gmail Setup Instructions */}
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-400 mb-2">Gmail App Password Setup</p>
                        <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                          <li>Go to your Google Account → Security</li>
                          <li>Enable 2-Step Verification if not already enabled</li>
                          <li>Search for "App passwords" in Google Account settings</li>
                          <li>Create a new app password for "Mail"</li>
                          <li>Use that 16-character password below</li>
                        </ol>
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:underline"
                        >
                          Open Google App Passwords <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* SMTP Settings */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <label className="block text-sm font-medium text-text-primary">
                            SMTP Server
                          </label>
                          <HelpTooltip text={helpTexts.smtpServer} position="right" />
                        </div>
                        <input
                          type="text"
                          value={settings.smtpServer}
                          onChange={(e) => updateSetting('smtpServer', e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <label className="block text-sm font-medium text-text-primary">
                            SMTP Port
                          </label>
                          <HelpTooltip text={helpTexts.smtpPort} position="right" />
                        </div>
                        <input
                          type="number"
                          value={settings.smtpPort}
                          onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value) || 587)}
                          placeholder="587"
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-text-primary">
                          Sender Email
                        </label>
                        {emailSettings.email && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle size={12} />
                            Configured
                          </span>
                        )}
                      </div>
                      <input
                        type="email"
                        value={settings.smtpEmail}
                        onChange={(e) => updateSetting('smtpEmail', e.target.value)}
                        placeholder="your.email@gmail.com"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <label className="block text-sm font-medium text-text-primary">
                            App Password
                          </label>
                          <HelpTooltip text={helpTexts.appPassword} position="right" />
                        </div>
                        {emailSettings.password_set && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle size={12} />
                            Set
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        value={settings.smtpPassword}
                        onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                        placeholder={emailSettings.password_set ? 'Enter new password to update...' : 'xxxx xxxx xxxx xxxx'}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                      />
                      <p className="mt-1.5 text-xs text-text-muted">
                        Use a Gmail App Password, not your regular password
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-text-primary">
                          Recipient Email
                        </label>
                        {emailSettings.recipient && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle size={12} />
                            Configured
                          </span>
                        )}
                      </div>
                      <input
                        type="email"
                        value={settings.emailRecipient}
                        onChange={(e) => updateSetting('emailRecipient', e.target.value)}
                        placeholder="notifications@example.com"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                      />
                      <p className="mt-1.5 text-xs text-text-muted">
                        Where to send notification emails
                      </p>
                    </div>
                  </div>

                  {/* Test Email Button */}
                  <div className="pt-4 border-t border-border">
                    <button
                      onClick={handleTestEmail}
                      disabled={sendingTestEmail || !emailSettings.configured}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors',
                        emailSettings.configured
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-surface-active text-text-muted cursor-not-allowed'
                      )}
                    >
                      {sendingTestEmail ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                    </button>
                    {!emailSettings.configured && (
                      <p className="mt-2 text-xs text-text-muted">
                        Save your settings first to enable test email
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Appearance</h3>
                <p className="text-sm text-text-secondary mb-6">
                  Customize the look and feel of the application.
                </p>
              </div>

              <div className="space-y-4">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon size={20} className="text-accent" />
                    ) : (
                      <Sun size={20} className="text-accent" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-text-primary">Theme</p>
                        <HelpTooltip text={helpTexts.themeToggle} position="right" />
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                      'bg-surface-hover hover:bg-surface-active text-text-primary'
                    )}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun size={16} />
                        <span className="text-sm">Switch to Light</span>
                      </>
                    ) : (
                      <>
                        <Moon size={16} />
                        <span className="text-sm">Switch to Dark</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Theme Preview */}
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="text-sm font-medium text-text-primary mb-3">Preview</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className={clsx(
                        'p-3 rounded-lg border-2 cursor-pointer transition-all',
                        theme === 'dark' 
                          ? 'border-accent bg-[#0a0a0b]' 
                          : 'border-transparent bg-[#0a0a0b] opacity-60 hover:opacity-80'
                      )}
                      onClick={() => theme !== 'dark' && toggleTheme()}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Moon size={14} className="text-[#a1a1aa]" />
                        <span className="text-xs font-medium text-[#fafafa]">Dark</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-[#1c1c1f] rounded" />
                        <div className="h-2 w-3/4 bg-[#27272a] rounded" />
                        <div className="h-2 w-1/2 bg-[#3f3f46] rounded" />
                      </div>
                    </div>
                    <div 
                      className={clsx(
                        'p-3 rounded-lg border-2 cursor-pointer transition-all',
                        theme === 'light' 
                          ? 'border-accent bg-[#f8fafc]' 
                          : 'border-transparent bg-[#f8fafc] opacity-60 hover:opacity-80'
                      )}
                      onClick={() => theme !== 'light' && toggleTheme()}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sun size={14} className="text-[#475569]" />
                        <span className="text-xs font-medium text-[#0f172a]">Light</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-[#e2e8f0] rounded" />
                        <div className="h-2 w-3/4 bg-[#cbd5e1] rounded" />
                        <div className="h-2 w-1/2 bg-[#94a3b8] rounded" />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-text-muted">
                  Your theme preference is saved automatically and will persist across sessions.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'research' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Deep Research</h3>
                <p className="text-sm text-text-secondary mb-6">
                  Configure web and academic search for research grounding.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text-primary">Enable Deep Research</p>
                      <HelpTooltip text={helpTexts.deepResearch} position="right" />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Search web and academic sources during research rounds
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('deepResearchEnabled', !settings.deepResearchEnabled)}
                    className={clsx(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.deepResearchEnabled ? 'bg-accent' : 'bg-surface-active'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        settings.deepResearchEnabled ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="block text-sm font-medium text-text-primary">
                      Queries per Round
                    </label>
                    <HelpTooltip text={helpTexts.queriesPerRound} position="right" />
                  </div>
                  <input
                    type="number"
                    value={settings.deepResearchQueries}
                    onChange={(e) => updateSetting('deepResearchQueries', parseInt(e.target.value))}
                    min={1}
                    max={10}
                    className="w-24 px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'models' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Model Routing</h3>
                <p className="text-sm text-text-secondary mb-6">
                  Configure which model handles each role in the pipeline.
                </p>
              </div>

              <div className="text-sm text-text-muted">
                Model routing configuration coming soon...
              </div>
            </div>
          )}

          {activeSection === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Advanced Settings</h3>
                <p className="text-sm text-text-secondary mb-6">
                  Performance and execution settings.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text-primary">Parallel Execution</p>
                      <HelpTooltip text={helpTexts.parallelExecution} position="right" />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Run independent operations in parallel
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('parallelEnabled', !settings.parallelEnabled)}
                    className={clsx(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.parallelEnabled ? 'bg-accent' : 'bg-surface-active'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        settings.parallelEnabled ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text-primary">Checkpointing</p>
                      <HelpTooltip text={helpTexts.checkpointing} position="right" />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Save progress to resume interrupted runs
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('checkpointEnabled', !settings.checkpointEnabled)}
                    className={clsx(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.checkpointEnabled ? 'bg-accent' : 'bg-surface-active'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        settings.checkpointEnabled ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Git Integration Section */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
                    <GitCommit size={16} />
                    Git Integration
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-text-primary">Auto-commit on File Save</p>
                        <HelpTooltip text="Automatically create WIP commits when code files are saved. Commit message format: 'wip: {filename}'" position="right" />
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Create automatic commits when you save code files
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        setTogglingAutoCommit(true);
                        try {
                          const newState = !autoCommitEnabled;
                          await toggleHook('auto-commit-file-save', newState);
                          setAutoCommitEnabled(newState);
                          toast.success(newState ? 'Auto-commit enabled' : 'Auto-commit disabled');
                        } catch (err) {
                          toast.error('Failed to toggle auto-commit');
                          console.error('Failed to toggle hook:', err);
                        } finally {
                          setTogglingAutoCommit(false);
                        }
                      }}
                      disabled={togglingAutoCommit}
                      className={clsx(
                        'w-12 h-6 rounded-full transition-colors relative',
                        autoCommitEnabled ? 'bg-accent' : 'bg-surface-active',
                        togglingAutoCommit && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          autoCommitEnabled ? 'translate-x-7' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
