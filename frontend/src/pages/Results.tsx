import { useState } from 'react';
import { 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  CheckCircle,
  Clock,
  Search
} from 'lucide-react';
import { clsx } from 'clsx';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  status?: 'completed' | 'running';
  children?: TreeNode[];
}

const mockResults: TreeNode[] = [
  {
    id: '1',
    name: 'aurora_v10_fast_control_head',
    type: 'folder',
    children: [
      {
        id: '1-1',
        name: '20251129_143022',
        type: 'folder',
        children: [
          { id: '1-1-1', name: 'decomposition.json', type: 'file' },
          {
            id: '1-1-2',
            name: 'd0_aurora_v10_fast_control_head',
            type: 'folder',
            status: 'completed',
            children: [
              { id: '1-1-2-1', name: 'node_result.json', type: 'file' },
              {
                id: '1-1-2-2',
                name: 'cycle_1',
                type: 'folder',
                children: [
                  { id: '1-1-2-2-1', name: 'deep_research_sources.json', type: 'file' },
                  { id: '1-1-2-2-2', name: 'full_run_cycle.json', type: 'file' },
                  { id: '1-1-2-2-3', name: 'checkpoint.json', type: 'file' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'emg_veto_signal_processing',
    type: 'folder',
    status: 'running',
    children: [
      {
        id: '2-1',
        name: '20251129_151245',
        type: 'folder',
        children: [
          { id: '2-1-1', name: 'decomposition.json', type: 'file' },
        ],
      },
    ],
  },
];

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  const hasChildren = node.children && node.children.length > 0;
  const Icon = node.type === 'folder' ? FolderOpen : FileText;

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
          'hover:bg-surface-hover'
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
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
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const [searchQuery, setSearchQuery] = useState('');

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
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
            </div>
          </div>
          
          <div className="p-2 max-h-[600px] overflow-auto">
            {mockResults.map((node) => (
              <TreeItem key={node.id} node={node} />
            ))}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-text-primary">Preview</h3>
          </div>
          
          <div className="p-5">
            <div className="bg-background-secondary rounded-lg p-6 text-center">
              <FileText size={48} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-secondary">
                Select a file to preview its contents
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
