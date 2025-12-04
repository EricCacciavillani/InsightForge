import { Minus, Square, X } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      platform: string;
    };
  }
}

interface TitlebarProps {
  backendConnected: boolean | null;
}

export default function Titlebar({ backendConnected }: TitlebarProps) {
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div className="h-10 bg-background-secondary border-b border-border flex items-center justify-between px-4 drag-region">
      {/* App title */}
      <div className="flex items-center gap-3 no-drag">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">N</span>
        </div>
        <span className="text-sm font-semibold text-text-primary">Neura Phase Lab</span>
      </div>

      {/* Connection status + Window controls */}
      <div className="flex items-center no-drag">
        <ConnectionStatus connected={backendConnected} compact />
        <button
          onClick={handleMinimize}
          className="w-10 h-10 flex items-center justify-center hover:bg-surface text-text-secondary hover:text-text-primary"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-10 flex items-center justify-center hover:bg-surface text-text-secondary hover:text-text-primary"
        >
          <Square size={14} />
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center hover:bg-red-600 text-text-secondary hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
