import { useState } from 'react';
import { Play, Plus, X, Loader2, Brain } from 'lucide-react';
import { clsx } from 'clsx';

export default function RunOrchestrator() {
  const [components, setComponents] = useState<string[]>(['']);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

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

    setIsRunning(true);
    setLogs(['[System] Starting orchestrator run...']);

    // TODO: Connect to actual backend via WebSocket
    // Simulating logs for now
    const mockLogs = [
      '[Stage 0] Decomposing component into subcomponents (openai)',
      '[Stage 0.5] Deep Research – Gathering sources from web/academic search',
      '[Deep Research] Generating search queries for: AURORA v10 fast control head',
      '[Deep Research] Found 12 unique results',
      '[Stage 1] Running Agent A and Agent B research rounds (parallel)',
      '[Stage 1] Agent A (OpenAI) – Round 1 complete',
      '[Stage 1] Agent B (Gemini) – Round 1 complete',
      '[Stage 1] Debate (openai)',
      '[Stage 1] Reviewers (parallel)',
      '[Stage 1] Paper v1 (gemini)',
      '[Final] Arbiter judgement: accept_for_implementation',
      '[Final] POC Champion: Lightweight Temporal CNN with Attention',
      '✅ Run complete!',
    ];

    for (const log of mockLogs) {
      await new Promise((r) => setTimeout(r, 800));
      setLogs((prev) => [...prev, log]);
    }

    setIsRunning(false);
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
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Components to Research
          </h3>

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
            <button
              onClick={startRun}
              disabled={isRunning || !components.some((c) => c.trim())}
              className={clsx(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
                isRunning || !components.some((c) => c.trim())
                  ? 'bg-surface-active text-text-muted cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hover text-white'
              )}
            >
              {isRunning ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Running...
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
            {isRunning && (
              <span className="ml-auto flex items-center gap-2 text-xs text-accent">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                Running
              </span>
            )}
          </div>

          <div className="flex-1 p-4 font-mono text-sm overflow-auto max-h-[500px] bg-background-secondary">
            {logs.length === 0 ? (
              <p className="text-text-muted">Output will appear here...</p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={clsx(
                    'py-1',
                    log.includes('✅') && 'text-success',
                    log.includes('⚠️') && 'text-warning',
                    log.includes('Error') && 'text-error',
                    !log.includes('✅') && !log.includes('⚠️') && !log.includes('Error') && 'text-text-secondary'
                  )}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
