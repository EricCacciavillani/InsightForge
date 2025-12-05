import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import { HelpTooltip } from './Tooltip';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tooltip?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatsCard({ title, value, icon: Icon, tooltip, trend }: StatsCardProps) {
  return (
    <div className="bg-surface rounded-xl p-5 border border-border hover:border-border-light transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-text-secondary text-sm">{title}</p>
            {tooltip && <HelpTooltip text={tooltip} position="right" />}
          </div>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon size={20} className="text-accent" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {trend.isPositive ? (
            <TrendingUp size={14} className="text-success" />
          ) : (
            <TrendingDown size={14} className="text-error" />
          )}
          <span
            className={clsx(
              'text-xs font-medium',
              trend.isPositive ? 'text-success' : 'text-error'
            )}
          >
            {trend.value}%
          </span>
          <span className="text-xs text-text-muted">vs last week</span>
        </div>
      )}
    </div>
  );
}
