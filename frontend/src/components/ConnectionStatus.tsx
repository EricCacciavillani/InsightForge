import { clsx } from 'clsx';

interface ConnectionStatusProps {
  connected: boolean | null;
  compact?: boolean;
}

export default function ConnectionStatus({ connected, compact = false }: ConnectionStatusProps) {
  // Still checking connection
  if (connected === null) {
    return (
      <div className={clsx(
        'flex items-center gap-2',
        compact ? 'px-2' : 'px-3 py-1.5'
      )}>
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        {!compact && <span className="text-xs text-text-secondary">Checking...</span>}
      </div>
    );
  }

  return (
    <div 
      className={clsx(
        'flex items-center gap-2 rounded-md transition-colors',
        compact ? 'px-2' : 'px-3 py-1.5',
        connected 
          ? 'text-green-500' 
          : 'text-red-500'
      )}
      title={connected ? 'Backend connected' : 'Backend disconnected'}
    >
      {connected ? (
        <>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {!compact && <span className="text-xs">Connected</span>}
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {!compact && <span className="text-xs">Disconnected</span>}
        </>
      )}
    </div>
  );
}
