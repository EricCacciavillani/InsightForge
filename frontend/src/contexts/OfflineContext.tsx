import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { checkHealth, fetchApi } from '../hooks/useApi';
import { useOfflineQueue, QueuedAction } from '../hooks/useOfflineQueue';
import { useToast } from '../components/Toast';

interface OfflineContextType {
  isOnline: boolean | null;
  queuedActions: QueuedAction[];
  queueAction: (action: Omit<QueuedAction, 'id' | 'timestamp'>) => string;
  clearQueue: () => void;
  isRetrying: boolean;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const prevOnline = useRef<boolean | null>(null);
  const toast = useToast();

  // Retry handler for queued actions
  const handleRetry = useCallback(async (action: QueuedAction): Promise<boolean> => {
    try {
      await fetchApi(action.endpoint, {
        method: action.method,
        body: action.body,
      });
      toast.success(`Retried: ${action.description}`);
      return true;
    } catch {
      return false;
    }
  }, [toast]);

  const {
    queue,
    addToQueue,
    clearQueue,
    isRetrying,
  } = useOfflineQueue({
    onRetry: handleRetry,
    isOnline: isOnline === true,
  });

  // Health check polling
  useEffect(() => {
    const checkConnection = async () => {
      const healthy = await checkHealth();
      
      // Show toast on status change (not initial load)
      if (prevOnline.current !== null && prevOnline.current !== healthy) {
        if (healthy) {
          toast.success('Backend reconnected');
          if (queue.length > 0) {
            toast.info(`Retrying ${queue.length} queued action(s)...`);
          }
        } else {
          toast.warning('Backend disconnected - actions will be queued');
        }
      }
      
      prevOnline.current = healthy;
      setIsOnline(healthy);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [toast, queue.length]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        queuedActions: queue,
        queueAction: addToQueue,
        clearQueue,
        isRetrying,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
