import { clsx } from 'clsx';
import { WifiOff, Wifi, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean | null;
  compact?: boolean;
  queuedCount?: number;
  isRetrying?: boolean;
}

export default function ConnectionStatus({ 
  connected, 
  compact = false, 
  queuedCount = 0,
  isRetrying = false 
}: ConnectionStatusProps) {
  // Still checking connection
  if (connected === null) {
    return (
      <div className={clsx(
        'flex items-center gap-2',
        compact ? 'px-2' : 'px-3 py-1.5'
      )}>
        <Loader2 size={14} className="animate-spin text-yellow-500" />
        {!compact && <span className="text-xs text-text-secondary">Checking...</span>}
      </div>
    );
  }

  // Offline state
  if (!connected) {
    return (
      <div 
        className={clsx(
          'flex items-center gap-2 rounded-md transition-colors',
          compact ? 'px-2' : 'px-3 py-1.5',
          'text-red-500'
        )}
        title={`Backend offline${queuedCount > 0 ? ` - ${queuedCount} action(s) queued` : ''}`}
      >
        <WifiOff size={14} className="animate-pulse" />
        {!compact && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">Offline</span>
            {queuedCount > 0 && (
              <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded-full">
                {queuedCount} queued
              </span>
            )}
          </div>
        )}
        {compact && queuedCount > 0 && (
          <span className="text-xs bg-red-500/20 px-1 py-0.5 rounded-full min-w-[18px] text-center">
            {queuedCount}
          </span>
        )}
      </div>
    );
  }

  // Online state (possibly retrying queued actions)
  return (
    <div 
      className={clsx(
        'flex items-center gap-2 rounded-md transition-colors',
        compact ? 'px-2' : 'px-3 py-1.5',
        'text-green-500'
      )}
      title={isRetrying ? 'Retrying queued actions...' : 'Backend connected'}
    >
      {isRetrying ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Wifi size={14} />
      )}
      {!compact && (
        <span className="text-xs">
          {isRetrying ? 'Syncing...' : 'Connected'}
        </span>
      )}
    </div>
  );
}
