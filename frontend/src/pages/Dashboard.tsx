import { Activity, Clock, Cpu, DollarSign, Zap } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import RecentRuns from '../components/RecentRuns';

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Overview of your research orchestrator activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Runs"
          value="24"
          icon={Activity}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Components Researched"
          value="156"
          icon={Cpu}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Avg. Run Time"
          value="18m 32s"
          icon={Clock}
          trend={{ value: 5, isPositive: false }}
        />
        <StatsCard
          title="Est. Cost (30d)"
          value="$47.82"
          icon={DollarSign}
          trend={{ value: 3, isPositive: false }}
        />
      </div>

      {/* Recent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentRuns />
        </div>
        
        {/* Quick Actions */}
        <div className="bg-surface rounded-xl p-5 border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors">
              <Zap size={18} />
              <span className="font-medium">New Research Run</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-surface-hover hover:bg-surface-active text-text-primary rounded-lg transition-colors border border-border">
              <Activity size={18} />
              <span className="font-medium">View All Results</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
