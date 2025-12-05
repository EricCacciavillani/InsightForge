import { useState, useCallback, useEffect, useRef } from 'react';

export interface QueuedAction {
  id: string;
  type: 'api_call';
  endpoint: string;
  method: string;
  body?: string;
  timestamp: number;
  description: string;
}

interface UseOfflineQueueOptions {
  onRetry: (action: QueuedAction) => Promise<boolean>;
  isOnline: boolean;
}

export function useOfflineQueue({ onRetry, isOnline }: UseOfflineQueueOptions) {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryingRef = useRef(false);

  const addToQueue = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, newAction]);
    return newAction.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // Retry queued actions when coming back online
  useEffect(() => {
    if (!isOnline || queue.length === 0 || retryingRef.current) return;

    const retryQueue = async () => {
      retryingRef.current = true;
      setIsRetrying(true);

      const actionsToRetry = [...queue];
      const successfulIds: string[] = [];

      for (const action of actionsToRetry) {
        try {
          const success = await onRetry(action);
          if (success) {
            successfulIds.push(action.id);
          }
        } catch {
          // Keep in queue if retry fails
        }
      }

      // Remove successful actions from queue
      if (successfulIds.length > 0) {
        setQueue((prev) => prev.filter((a) => !successfulIds.includes(a.id)));
      }

      setIsRetrying(false);
      retryingRef.current = false;
    };

    // Small delay to ensure connection is stable
    const timeout = setTimeout(retryQueue, 1000);
    return () => clearTimeout(timeout);
  }, [isOnline, queue, onRetry]);

  return {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    isRetrying,
    queueLength: queue.length,
  };
}
