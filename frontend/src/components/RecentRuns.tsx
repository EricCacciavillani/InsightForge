import { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { getRuns } from '../hooks/useApi';

interface Run {
  component: string;
  timestamp: string;
  path: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
    label: 'Completed',
  },
  running: {
    icon: Clock,
    color: 'text-accent',
    bg: 'bg-accent/10',
    label: 'Running',
  },
  failed: {
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
    label: 'Failed',
  },
};

function formatTimestamp(timestamp: string): string {
  // timestamp format: YYYYMMDD_HHMMSS
  const match = timestamp.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
  if (!match) return timestamp;
  
  const [, year, month, day, hour, min] = match;
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(min)
  );
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function RecentRuns() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await getRuns();
      setRuns(data.runs.slice(0, 5)); // Show only 5 most recent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Recent Runs</h3>
        <button 
          onClick={() => navigate('/results')}
          className="text-sm text-accent hover:text-accent-hover flex items-center gap-1"
        >
          View all <ChevronRight size={16} />
        </button>
      </div>
      
      <div className="divide-y divide-border">
        {loading ? (
          <div className="px-5 py-8 flex items-center justify-center">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : error ? (
          <div className="px-5 py-4 text-sm text-red-400">{error}</div>
        ) : runs.length === 0 ? (
          <div className="px-5 py-8 text-center text-text-muted text-sm">
            No runs yet. Start your first research run!
          </div>
        ) : (
          runs.map((run) => {
            const status = statusConfig.completed;
            const StatusIcon = status.icon;
            
            return (
              <div
                key={`${run.component}-${run.timestamp}`}
                onClick={() => navigate('/results')}
                className="px-5 py-4 hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">
                      {run.component.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted">{formatTimestamp(run.timestamp)}</span>
                    </div>
                  </div>
                  
                  <div className={clsx('flex items-center gap-1.5 px-2 py-1 rounded-full', status.bg)}>
                    <StatusIcon size={14} className={status.color} />
                    <span className={clsx('text-xs font-medium', status.color)}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
