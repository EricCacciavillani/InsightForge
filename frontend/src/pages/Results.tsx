import { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  CheckCircle,
  Clock,
  Search,
  Loader2,
  Download,
  FileDown,
  Copy,
  Check
} from 'lucide-react';
import { clsx } from 'clsx';
import { getRuns, getRunDetails, exportRunAsZip, exportRunAsMarkdown, getRunSummary, downloadBlob } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { helpTexts } from '../components/Tooltip';
import { SkeletonTreeItem, Skeleton } from '../components/Skeleton';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  status?: 'completed' | 'running';
  children?: TreeNode[];
  component?: string;
  timestamp?: string;
}

interface RunData {
  component: string;
  timestamp: string;
  path: string;
}

function ExportButtons({ component, timestamp, disabled }: { component: string; timestamp: string; disabled?: boolean }) {
  const [exporting, setExporting] = useState<'zip' | 'md' | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleExportZip = async () => {
    setExporting('zip');
    try {
      const blob = await exportRunAsZip(component, timestamp);
      downloadBlob(blob, `${component}_${timestamp}.zip`);
      toast.success('ZIP file downloaded');
    } catch (err) {
      toast.error('Failed to export ZIP');
      console.error('Export ZIP error:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportMarkdown = async () => {
    setExporting('md');
    try {
      const blob = await exportRunAsMarkdown(component, timestamp);
      downloadBlob(blob, `${component}_${timestamp}_report.md`);
      toast.success('Markdown report downloaded');
    } catch (err) {
      toast.error('Failed to export Markdown');
      console.error('Export Markdown error:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleCopySummary = async () => {
    try {
      const summary = await getRunSummary(component, timestamp);
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy summary');
      console.error('Copy summary error:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative group">
        <button
          onClick={handleExportZip}
          disabled={exporting !== null || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-background hover:bg-surface-hover border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'zip' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          ZIP
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-surface-hover border border-border rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {helpTexts.exportZip}
        </span>
      </div>
      <div className="relative group">
        <button
          onClick={handleExportMarkdown}
          disabled={exporting !== null || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-background hover:bg-surface-hover border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'md' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileDown size={14} />
          )}
          MD
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-surface-hover border border-border rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {helpTexts.exportMarkdown}
        </span>
      </div>
      <div className="relative group">
        <button
          onClick={handleCopySummary}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-background hover:bg-surface-hover border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <Check size={14} className="text-success" />
          ) : (
            <Copy size={14} />
          )}
          Copy
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-surface-hover border border-border rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {helpTexts.copySummary}
        </span>
      </div>
    </div>
  );
}

function TreeItem({ 
  node, 
  depth = 0, 
  onSelect,
  selectedId 
}: { 
  node: TreeNode; 
  depth?: number;
  onSelect?: (component: string, timestamp: string) => void;
  selectedId?: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  const hasChildren = node.children && node.children.length > 0;
  const Icon = node.type === 'folder' ? FolderOpen : FileText;
  const isSelected = selectedId === node.id;
  const isClickable = node.component && node.timestamp;

  const handleClick = () => {
    if (isClickable && onSelect) {
      onSelect(node.component!, node.timestamp!);
    } else if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
          isSelected ? 'bg-accent/20' : 'hover:bg-surface-hover'
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={16} className="text-text-muted" />
          ) : (
            <ChevronRight size={16} className="text-text-muted" />
          )
        ) : (
          <span className="w-4" />
        )}
        
        <Icon
          size={16}
          className={node.type === 'folder' ? 'text-accent' : 'text-text-secondary'}
        />
        
        <span className="text-sm text-text-primary flex-1 truncate">{node.name}</span>
        
        {node.status === 'completed' && (
          <CheckCircle size={14} className="text-success" />
        )}
        {node.status === 'running' && (
          <Clock size={14} className="text-accent animate-pulse" />
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<TreeNode[]>([]);
  const [selectedRun, setSelectedRun] = useState<{ component: string; timestamp: string } | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadRuns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await getRuns();
      
      // Group runs by component
      const grouped: Record<string, RunData[]> = {};
      for (const run of data.runs) {
        if (!grouped[run.component]) {
          grouped[run.component] = [];
        }
        grouped[run.component].push(run);
      }

      // Build tree structure
      const tree: TreeNode[] = Object.entries(grouped).map(([component, runs], idx) => ({
        id: `comp-${idx}`,
        name: component,
        type: 'folder' as const,
        status: 'completed' as const,
        children: runs.map((run, runIdx) => ({
          id: `run-${idx}-${runIdx}`,
          name: run.timestamp,
          type: 'folder' as const,
          component: run.component,
          timestamp: run.timestamp,
          children: [
            { id: `file-${idx}-${runIdx}-decomp`, name: 'decomposition.json', type: 'file' as const },
          ],
        })),
      }));

      setResults(tree);
    } catch (err) {
      toast.error('Failed to load run history');
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRun = async (component: string, timestamp: string) => {
    setSelectedRun({ component, timestamp });
    setDetailsLoading(true);
    try {
      const details = await getRunDetails(component, timestamp);
      setRunDetails(details);
    } catch (err) {
      toast.error('Failed to load run details');
      console.error('Failed to load run details:', err);
      setRunDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Results</h1>
        <p className="text-text-secondary mt-1">
          Browse and explore research run outputs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree */}
        <div className="lg:col-span-1 bg-surface rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search results..."
                disabled={loading}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          
          <div className="p-2 max-h-[600px] overflow-auto">
            {loading ? (
              <div className="space-y-1">
                {/* Skeleton tree items for loading state */}
                <SkeletonTreeItem depth={0} />
                <SkeletonTreeItem depth={1} />
                <SkeletonTreeItem depth={1} />
                <SkeletonTreeItem depth={0} />
                <SkeletonTreeItem depth={1} />
                <SkeletonTreeItem depth={2} />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                No results yet. Run some research first!
              </div>
            ) : (
              results
                .filter(node => 
                  !searchQuery || 
                  node.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((node) => (
                  <TreeItem 
                    key={node.id} 
                    node={node} 
                    onSelect={handleSelectRun}
                    selectedId={selectedRun ? `run-${results.findIndex(r => r.name === selectedRun.component)}-${results.find(r => r.name === selectedRun.component)?.children?.findIndex(c => c.timestamp === selectedRun.timestamp)}` : undefined}
                  />
                ))
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">
              {selectedRun ? `${selectedRun.component} / ${selectedRun.timestamp}` : 'Preview'}
            </h3>
            {selectedRun && (
              <ExportButtons 
                component={selectedRun.component} 
                timestamp={selectedRun.timestamp}
                disabled={detailsLoading}
              />
            )}
          </div>
          
          <div className="p-5 max-h-[600px] overflow-auto">
            {detailsLoading ? (
              <div className="space-y-4">
                {/* Skeleton for details loading */}
                <div>
                  <Skeleton variant="text" width={120} height={16} className="mb-2" />
                  <Skeleton variant="rectangular" height={200} className="w-full" />
                </div>
                <div>
                  <Skeleton variant="text" width={150} height={16} className="mb-2" />
                  <Skeleton variant="rectangular" height={150} className="w-full" />
                </div>
              </div>
            ) : runDetails ? (
              <div className="space-y-4">
                {runDetails.decomposition && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-2">Decomposition</h4>
                    <pre className="bg-background-secondary rounded-lg p-4 text-xs text-text-secondary overflow-auto max-h-[300px]">
                      {JSON.stringify(runDetails.decomposition, null, 2)}
                    </pre>
                  </div>
                )}
                {runDetails.nodes && runDetails.nodes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-2">
                      Node Results ({runDetails.nodes.length})
                    </h4>
                    <pre className="bg-background-secondary rounded-lg p-4 text-xs text-text-secondary overflow-auto max-h-[300px]">
                      {JSON.stringify(runDetails.nodes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-background-secondary rounded-lg p-6 text-center">
                <FileText size={48} className="mx-auto text-text-muted mb-3" />
                <p className="text-text-secondary">
                  Select a run to preview its contents
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
