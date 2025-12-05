import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = 'http://127.0.0.1:8742';
const WS_URL = 'ws://127.0.0.1:8742/ws';

// -------------- REST API --------------

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export function useApiQuery<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchApi<T>(endpoint);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// -------------- WebSocket --------------

export interface WsMessage {
  type: 'log' | 'run_started' | 'run_complete' | 'run_error' | 'component_complete' | 'progress';
  message?: string;
  components?: string[];
  component?: string;
  nodes?: number;
  error?: string;
  usage?: {
    openai_tokens: number;
    gemini_tokens: number;
    tavily_searches: number;
    estimated_cost: number;
  };
  // Progress fields
  stage?: string;
  node?: string;
  cycle?: number;
  total_cycles?: number;
  current_node?: number;
  total_nodes?: number;
  percent?: number;
  elapsed_seconds?: number;
  eta_seconds?: number;
}

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          onMessage(msg);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting...');
        setConnected(false);
        setTimeout(connect, 2000);
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [onMessage]);

  return { connected };
}

// -------------- API Functions --------------

export async function startRun(components: string[]) {
  return fetchApi<{ status: string; components: string[] }>('/run', {
    method: 'POST',
    body: JSON.stringify({ components }),
  });
}

export async function getRuns() {
  return fetchApi<{ runs: Array<{ component: string; timestamp: string; path: string }> }>('/runs');
}

export async function getRunDetails(component: string, timestamp: string) {
  return fetchApi<{
    component: string;
    timestamp: string;
    decomposition: any;
    nodes: any[];
  }>(`/runs/${component}/${timestamp}`);
}

export async function getConfig() {
  return fetchApi<{
    deep_research_enabled: boolean;
    deep_research_queries: number;
    parallel_enabled: boolean;
    checkpoint_enabled: boolean;
    model_routing: Record<string, string | string[]>;
    api_keys_set: {
      openai: boolean;
      gemini: boolean;
      tavily: boolean;
    };
    api_keys_masked?: {
      openai: string;
      gemini: string;
      tavily: string;
    };
    email_settings?: {
      enabled: boolean;
      smtp_server: string;
      smtp_port: number;
      email: string;
      password_set: boolean;
      recipient: string;
      configured: boolean;
    };
  }>('/config');
}

export async function updateSettings(settings: {
  openai_key?: string;
  gemini_key?: string;
  tavily_key?: string;
  email_enabled?: boolean;
  smtp_server?: string;
  smtp_port?: number;
  smtp_email?: string;
  smtp_password?: string;
  email_recipient?: string;
}) {
  return fetchApi<{ status: string }>('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function sendTestEmail() {
  return fetchApi<{ status: string; message: string }>('/test-email', {
    method: 'POST',
  });
}

export async function getUsage() {
  return fetchApi<{
    openai_input_tokens: number;
    openai_output_tokens: number;
    gemini_input_tokens: number;
    gemini_output_tokens: number;
    tavily_searches: number;
    estimated_cost_usd: number;
  }>('/usage');
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// -------------- Export Functions --------------

export async function exportRunAsZip(component: string, timestamp: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/runs/${component}/${timestamp}/export/zip`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Export failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.blob();
}

export async function exportRunAsMarkdown(component: string, timestamp: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/runs/${component}/${timestamp}/export/markdown`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Export failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.blob();
}

export async function getRunSummary(component: string, timestamp: string): Promise<string> {
  const result = await fetchApi<{ summary: string }>(`/runs/${component}/${timestamp}/summary`);
  return result.summary;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
