import { useState, useEffect } from 'react';
import { Activity, Clock, Cpu, DollarSign, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import RecentRuns from '../components/RecentRuns';
import { getUsage, getRuns } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { helpTexts } from '../components/Tooltip';

interface UsageStats {
  openai_input_tokens: number;
  openai_output_tokens: number;
  gemini_input_tokens: number;
  gemini_output_tokens: number;
  tavily_searches: number;
  estimated_cost_usd: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [totalRuns, setTotalRuns] = useState(0);
  const toast = useToast();

  useEffect(() => {
    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [usageData, runsData] = await Promise.all([
        getUsage(),
        getRuns(),
      ]);
      setUsage(usageData);
      setTotalRuns(runsData.runs.length);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const totalTokens = usage 
    ? usage.openai_input_tokens + usage.openai_output_tokens + usage.gemini_input_tokens + usage.gemini_output_tokens
    : 0;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

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
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface rounded-xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-surface-hover rounded w-24 mb-3" />
                <div className="h-8 bg-surface-hover rounded w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Runs"
              value={totalRuns.toString()}
              icon={Activity}
              tooltip={helpTexts.totalRuns}
            />
            <StatsCard
              title="Total Tokens"
              value={formatTokens(totalTokens)}
              icon={Cpu}
              tooltip={helpTexts.totalTokens}
            />
            <StatsCard
              title="Tavily Searches"
              value={usage?.tavily_searches.toString() || '0'}
              icon={Clock}
              tooltip={helpTexts.tavilySearches}
            />
            <StatsCard
              title="Est. Cost"
              value={`$${usage?.estimated_cost_usd.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              tooltip={helpTexts.estimatedCost}
            />
          </>
        )}
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
            <button 
              onClick={() => navigate('/run')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              <Zap size={18} />
              <span className="font-medium">New Research Run</span>
            </button>
            <button 
              onClick={() => navigate('/results')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-surface-hover hover:bg-surface-active text-text-primary rounded-lg transition-colors border border-border"
            >
              <Activity size={18} />
              <span className="font-medium">View All Results</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
