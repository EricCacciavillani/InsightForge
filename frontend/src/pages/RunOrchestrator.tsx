import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Plus, X, Loader2, Brain, DollarSign, WifiOff, Clock, Save, FolderOpen, Trash2, Download, Upload, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { startRun as apiStartRun, useWebSocket, WsMessage } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { useOffline } from '../contexts/OfflineContext';
import { HelpTooltip, helpTexts } from '../components/Tooltip';

// -------------- Template Types & Storage --------------

interface RunTemplate {
  id: string;
  name: string;
  components: string[];
  createdAt: string;
  updatedAt: string;
}

const TEMPLATES_STORAGE_KEY = 'neura_lab_run_templates';

function loadTemplates(): RunTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: RunTemplate[]): void {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

function generateTemplateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

interface RunUsage {
  openai_tokens: number;
  gemini_tokens: number;
  tavily_searches: number;
  estimated_cost: number;
}

interface RunProgress {
  stage: string;
  node: string;
  cycle: number;
  total_cycles: number;
  current_node: number;
  total_nodes: number;
  percent: number;
  elapsed_seconds: number;
  eta_seconds: number | null;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatStage(stage: string): string {
  const names: Record<string, string> = {
    deep_research: 'Deep Research',
    research: 'Research Rounds',
    debate: 'Debate',
    reviewers: 'Reviewers',
    paper_v1: 'Paper v1',
    critics: 'Critics',
    paper_v1b: 'Paper Revision',
    verification: 'Verification',
    meta_debate: 'Meta-Debate',
    meta_reviewers: 'Meta-Reviewers',
    paper_v2: 'Paper v2',
    final_arbiter: 'Final Arbiter',
    arch_training: 'Architecture Spec',
  };
  return names[stage] || stage;
}

export default function RunOrchestrator() {
  const [components, setComponents] = useState<string[]>(['']);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [runUsage, setRunUsage] = useState<RunUsage | null>(null);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  
  // Template state
  const [templates, setTemplates] = useState<RunTemplate[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates on mount
  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  // Close template menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as Node)) {
        setShowTemplateMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Template management functions
  const saveAsTemplate = () => {
    const validComponents = components.filter((c) => c.trim());
    if (validComponents.length === 0) {
      toast.error('Add at least one component before saving');
      return;
    }
    if (!templateName.trim()) {
      toast.error('Enter a template name');
      return;
    }
    
    const newTemplate: RunTemplate = {
      id: generateTemplateId(),
      name: templateName.trim(),
      components: validComponents,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates(updated);
    setShowSaveDialog(false);
    setTemplateName('');
    toast.success(`Template "${newTemplate.name}" saved`);
  };

  const loadTemplate = (template: RunTemplate) => {
    setComponents(template.components.length > 0 ? [...template.components] : ['']);
    setShowTemplateMenu(false);
    toast.info(`Loaded template "${template.name}"`);
  };

  const deleteTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const template = templates.find((t) => t.id === templateId);
    const updated = templates.filter((t) => t.id !== templateId);
    setTemplates(updated);
    saveTemplates(updated);
    toast.success(`Template "${template?.name}" deleted`);
  };

  const exportTemplates = () => {
    if (templates.length === 0) {
      toast.error('No templates to export');
      return;
    }
    const data = JSON.stringify(templates, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neura_lab_templates_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${templates.length} template(s)`);
  };

  const importTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as RunTemplate[];
        if (!Array.isArray(imported)) {
          throw new Error('Invalid format');
        }
        // Validate and regenerate IDs to avoid conflicts
        const validTemplates = imported
          .filter((t) => t.name && Array.isArray(t.components))
          .map((t) => ({
            ...t,
            id: generateTemplateId(),
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        
        if (validTemplates.length === 0) {
          throw new Error('No valid templates found');
        }
        
        const updated = [...templates, ...validTemplates];
        setTemplates(updated);
        saveTemplates(updated);
        toast.success(`Imported ${validTemplates.length} template(s)`);
      } catch (err) {
        toast.error('Failed to import templates: invalid file format');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'log':
        if (msg.message) {
          setLogs((prev) => [...prev, msg.message!]);
        }
        break;
      case 'progress':
        setProgress({
          stage: msg.stage || '',
          node: msg.node || '',
          cycle: msg.cycle || 1,
          total_cycles: msg.total_cycles || 3,
          current_node: msg.current_node || 1,
          total_nodes: msg.total_nodes || 1,
          percent: msg.percent || 0,
          elapsed_seconds: msg.elapsed_seconds || 0,
          eta_seconds: msg.eta_seconds ?? null,
        });
        break;
      case 'run_started':
        setIsRunning(true);
        setLogs(['[System] Starting orchestrator run...']);
        setRunUsage(null);
        setProgress(null);
        toast.info('Research run started');
        break;
      case 'component_complete':
        setLogs((prev) => [...prev, `✅ Component complete: ${msg.component} (${msg.nodes} nodes)`]);
        toast.success(`Component complete: ${msg.component}`);
        break;
      case 'run_complete':
        setIsRunning(false);
        setProgress(null);
        setLogs((prev) => [...prev, '✅ Run complete!']);
        if (msg.usage) {
          setRunUsage(msg.usage);
        }
        toast.success('Research run completed successfully');
        break;
      case 'run_error':
        setIsRunning(false);
        setProgress(null);
        setLogs((prev) => [...prev, `❌ Error: ${msg.error}`]);
        toast.error(`Run failed: ${msg.error}`);
        break;
    }
  }, [toast]);

  const { connected } = useWebSocket(handleWsMessage);
  const { isOnline } = useOffline();

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addComponent = () => {
    setComponents([...components, '']);
  };

  const removeComponent = (index: number) => {
    if (components.length > 1) {
      setComponents(components.filter((_, i) => i !== index));
    }
  };

  const updateComponent = (index: number, value: string) => {
    const updated = [...components];
    updated[index] = value;
    setComponents(updated);
  };

  const startRun = async () => {
    const validComponents = components.filter((c) => c.trim());
    if (validComponents.length === 0) return;

    try {
      setIsRunning(true);
      setLogs(['[System] Connecting to backend...']);
      setRunUsage(null);
      await apiStartRun(validComponents);
      // WebSocket will handle the rest via handleWsMessage
    } catch (err) {
      setIsRunning(false);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setLogs((prev) => [...prev, `❌ Failed to start run: ${errorMsg}`]);
      toast.error(`Failed to start run: ${errorMsg}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Run Orchestrator</h1>
        <p className="text-text-secondary mt-1">
          Start a new multi-agent research run
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-text-primary">
                Components to Research
              </h3>
              <HelpTooltip text={helpTexts.components} position="right" />
            </div>
            
            {/* Template Actions */}
            <div className="flex items-center gap-2">
              {/* Save Template Button */}
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={isRunning || !components.some((c) => c.trim())}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                  isRunning || !components.some((c) => c.trim())
                    ? 'text-text-muted cursor-not-allowed'
                    : 'text-text-secondary hover:text-accent hover:bg-accent/10'
                )}
                title="Save as template"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Save</span>
              </button>
              
              {/* Load Template Dropdown */}
              <div className="relative" ref={templateMenuRef}>
                <button
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  disabled={isRunning}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                    isRunning
                      ? 'text-text-muted cursor-not-allowed'
                      : 'text-text-secondary hover:text-accent hover:bg-accent/10'
                  )}
                  title="Load template"
                >
                  <FolderOpen size={14} />
                  <span className="hidden sm:inline">Templates</span>
                  <ChevronDown size={12} className={clsx('transition-transform', showTemplateMenu && 'rotate-180')} />
                </button>
                
                {showTemplateMenu && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-surface border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    {/* Import/Export Actions */}
                    <div className="p-2 border-b border-border flex gap-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-text-secondary hover:text-accent hover:bg-accent/10 rounded transition-colors"
                      >
                        <Upload size={12} />
                        Import
                      </button>
                      <button
                        onClick={exportTemplates}
                        disabled={templates.length === 0}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors',
                          templates.length === 0
                            ? 'text-text-muted cursor-not-allowed'
                            : 'text-text-secondary hover:text-accent hover:bg-accent/10'
                        )}
                      >
                        <Download size={12} />
                        Export
                      </button>
                    </div>
                    
                    {/* Template List */}
                    <div className="max-h-64 overflow-y-auto">
                      {templates.length === 0 ? (
                        <div className="p-4 text-center text-sm text-text-muted">
                          No saved templates
                        </div>
                      ) : (
                        templates.map((template) => (
                          <div
                            key={template.id}
                            onClick={() => loadTemplate(template)}
                            className="flex items-center justify-between px-3 py-2 hover:bg-surface-hover cursor-pointer group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {template.name}
                              </p>
                              <p className="text-xs text-text-muted">
                                {template.components.length} component{template.components.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <button
                              onClick={(e) => deleteTemplate(template.id, e)}
                              className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete template"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={importTemplates}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-3">
            {components.map((component, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={component}
                  onChange={(e) => updateComponent(index, e.target.value)}
                  placeholder="e.g., AURORA v10 fast control head"
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  disabled={isRunning}
                />
                {components.length > 1 && (
                  <button
                    onClick={() => removeComponent(index)}
                    className="px-3 py-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                    disabled={isRunning}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addComponent}
            className="mt-3 flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
            disabled={isRunning}
          >
            <Plus size={16} />
            Add another component
          </button>

          <div className="mt-6 pt-4 border-t border-border">
            {/* Offline warning */}
            {!isOnline && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
                <WifiOff size={16} />
                <span>Backend offline - cannot start runs</span>
              </div>
            )}
            <button
              onClick={startRun}
              disabled={isRunning || !components.some((c) => c.trim()) || !isOnline}
              className={clsx(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
                isRunning || !components.some((c) => c.trim()) || !isOnline
                  ? 'bg-surface-active text-text-muted cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hover text-white'
              )}
            >
              {isRunning ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Running...
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff size={18} />
                  Offline
                </>
              ) : (
                <>
                  <Play size={18} />
                  Start Research Run
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Output */}
        <div className="bg-surface rounded-xl border border-border flex flex-col">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Brain size={18} className="text-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Live Output</h3>
            <HelpTooltip text={helpTexts.liveOutput} position="bottom" />
            <span className="ml-auto flex items-center gap-2 text-xs">
              {isRunning ? (
                <span className="flex items-center gap-2 text-accent">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  Running
                </span>
              ) : connected ? (
                <span className="flex items-center gap-2 text-green-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-500">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Disconnected
                </span>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          {progress && isRunning && (
            <div className="px-5 py-3 border-b border-border bg-surface-hover">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">
                  <span className="text-text-primary font-medium">{formatStage(progress.stage)}</span>
                  {' · '}Node {progress.current_node}/{progress.total_nodes}
                  {' · '}Cycle {progress.cycle}/{progress.total_cycles}
                </span>
                <span className="flex items-center gap-2 text-text-muted">
                  <Clock size={14} />
                  {formatTime(progress.elapsed_seconds)}
                  {progress.eta_seconds !== null && (
                    <span className="text-text-secondary">
                      (~{formatTime(progress.eta_seconds)} left)
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="text-right text-xs text-text-muted mt-1">
                {progress.percent}%
              </div>
            </div>
          )}

          <div className="flex-1 p-4 font-mono text-sm overflow-auto max-h-[500px] bg-background-secondary">
            {logs.length === 0 ? (
              <p className="text-text-muted">Output will appear here...</p>
            ) : (
              <>
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'py-1',
                      log.includes('✅') && 'text-success',
                      log.includes('⚠️') && 'text-warning',
                      (log.includes('Error') || log.includes('❌')) && 'text-error',
                      !log.includes('✅') && !log.includes('⚠️') && !log.includes('Error') && !log.includes('❌') && 'text-text-secondary'
                    )}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>

          {/* Cost Estimate */}
          {runUsage && (
            <div className="px-5 py-3 border-t border-border bg-surface-hover">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign size={16} className="text-accent" />
                <span className="text-text-secondary">Estimated cost:</span>
                <span className="text-text-primary font-medium">${runUsage.estimated_cost.toFixed(4)}</span>
                <span className="text-text-muted">•</span>
                <span className="text-text-muted text-xs">
                  {runUsage.openai_tokens.toLocaleString()} OpenAI tokens, {runUsage.gemini_tokens.toLocaleString()} Gemini tokens
                  {runUsage.tavily_searches > 0 && `, ${runUsage.tavily_searches} searches`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Save as Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., BCI Research Components"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveAsTemplate();
                    if (e.key === 'Escape') {
                      setShowSaveDialog(false);
                      setTemplateName('');
                    }
                  }}
                />
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-text-muted mb-2">Components to save:</p>
                <ul className="text-sm text-text-secondary space-y-1">
                  {components.filter((c) => c.trim()).map((c, i) => (
                    <li key={i} className="truncate">• {c}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setTemplateName('');
                  }}
                  className="flex-1 px-4 py-2.5 text-text-secondary hover:text-text-primary border border-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAsTemplate}
                  disabled={!templateName.trim()}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors',
                    templateName.trim()
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'bg-surface-active text-text-muted cursor-not-allowed'
                  )}
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
