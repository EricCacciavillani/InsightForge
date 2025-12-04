import { useState } from 'react';
import { Save, Key, Cpu, Zap, Database } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ElementType;
}

const sections: SettingSection[] = [
  { id: 'api', title: 'API Keys', icon: Key },
  { id: 'models', title: 'Model Routing', icon: Cpu },
  { id: 'research', title: 'Deep Research', icon: Zap },
  { id: 'advanced', title: 'Advanced', icon: Database },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('api');
  const [settings, setSettings] = useState({
    openaiKey: '',
    geminiKey: '',
    tavilyKey: '',
    deepResearchEnabled: true,
    deepResearchQueries: 5,
    parallelEnabled: true,
    parallelWorkers: 4,
    checkpointEnabled: true,
  });

  const updateSetting = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
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
        <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors">
          <Save size={16} />
          Save Changes
        </button>
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={settings.openaiKey}
                    onChange={(e) => updateSetting('openaiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={settings.geminiKey}
                    onChange={(e) => updateSetting('geminiKey', e.target.value)}
                    placeholder="AI..."
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Tavily API Key
                  </label>
                  <input
                    type="password"
                    value={settings.tavilyKey}
                    onChange={(e) => updateSetting('tavilyKey', e.target.value)}
                    placeholder="tvly-..."
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Get a free key at tavily.com for deep research capabilities
                  </p>
                </div>
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
                    <p className="text-sm font-medium text-text-primary">Enable Deep Research</p>
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
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Queries per Round
                  </label>
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
                    <p className="text-sm font-medium text-text-primary">Parallel Execution</p>
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
                    <p className="text-sm font-medium text-text-primary">Checkpointing</p>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
