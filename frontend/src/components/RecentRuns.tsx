import { CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface Run {
  id: string;
  component: string;
  status: 'completed' | 'running' | 'failed';
  duration: string;
  timestamp: string;
  nodesProcessed: number;
}

const mockRuns: Run[] = [
  {
    id: '1',
    component: 'AURORA v10 fast control head',
    status: 'completed',
    duration: '23m 45s',
    timestamp: '2 hours ago',
    nodesProcessed: 8,
  },
  {
    id: '2',
    component: 'EMG veto signal processing',
    status: 'running',
    duration: '12m 18s',
    timestamp: 'Just now',
    nodesProcessed: 3,
  },
  {
    id: '3',
    component: 'Gaze fusion pipeline',
    status: 'completed',
    duration: '18m 02s',
    timestamp: '5 hours ago',
    nodesProcessed: 6,
  },
  {
    id: '4',
    component: 'Movement router optimization',
    status: 'failed',
    duration: '8m 33s',
    timestamp: 'Yesterday',
    nodesProcessed: 2,
  },
];

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

export default function RecentRuns() {
  return (
    <div className="bg-surface rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Recent Runs</h3>
        <button className="text-sm text-accent hover:text-accent-hover flex items-center gap-1">
          View all <ChevronRight size={16} />
        </button>
      </div>
      
      <div className="divide-y divide-border">
        {mockRuns.map((run) => {
          const status = statusConfig[run.status];
          const StatusIcon = status.icon;
          
          return (
            <div
              key={run.id}
              className="px-5 py-4 hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium truncate">
                    {run.component}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-muted">{run.timestamp}</span>
                    <span className="text-xs text-text-muted">•</span>
                    <span className="text-xs text-text-muted">{run.duration}</span>
                    <span className="text-xs text-text-muted">•</span>
                    <span className="text-xs text-text-muted">
                      {run.nodesProcessed} nodes
                    </span>
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
        })}
      </div>
    </div>
  );
}
