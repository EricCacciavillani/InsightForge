import { useState, useRef, ReactNode } from 'react';
import { HelpCircle, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

interface TooltipProps {
  content: string;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  docLink?: string;
  showIcon?: boolean;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  docLink,
  showIcon = true,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <div
      ref={triggerRef}
      className={clsx('relative inline-flex items-center', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        showIcon && (
          <HelpCircle
            size={14}
            className="text-text-muted hover:text-text-secondary cursor-help transition-colors"
          />
        )
      )}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={clsx(
            'absolute z-50 px-3 py-2 text-xs rounded-lg shadow-lg',
            'bg-surface-hover border border-border',
            'text-text-secondary max-w-xs whitespace-normal',
            'animate-fade-in',
            positionClasses[position]
          )}
          style={{
            left: position === 'top' || position === 'bottom' ? '50%' : undefined,
            transform: position === 'top' || position === 'bottom' ? 'translateX(-50%)' : undefined,
          }}
        >
          <p className="leading-relaxed">{content}</p>
          {docLink && (
            <a
              href={docLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Learn more</span>
              <ExternalLink size={10} />
            </a>
          )}
          {/* Arrow */}
          <div
            className={clsx(
              'absolute w-2 h-2 bg-surface-hover border-border rotate-45',
              position === 'top' && 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b',
              position === 'bottom' && 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t',
              position === 'left' && 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r',
              position === 'right' && 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l'
            )}
          />
        </div>
      )}
    </div>
  );
}

// Convenience component for inline help icons with tooltips
interface HelpTooltipProps {
  text: string;
  docLink?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ text, docLink, position = 'top' }: HelpTooltipProps) {
  return (
    <Tooltip content={text} docLink={docLink} position={position} showIcon={true} />
  );
}

// Help text definitions for consistent tooltips across the app
export const helpTexts = {
  // Dashboard
  totalRuns: 'Total number of research runs completed. Each run processes one or more components through the multi-agent pipeline.',
  totalTokens: 'Combined token usage across all LLM providers (OpenAI + Gemini). Higher token counts indicate more extensive research.',
  tavilySearches: 'Number of web and academic searches performed via Tavily for deep research grounding.',
  estimatedCost: 'Estimated API cost based on token usage and search queries. Actual costs may vary.',
  
  // Run Orchestrator
  components: 'Enter the research topics or components you want to analyze. Each component goes through the full multi-agent research pipeline.',
  templates: 'Save frequently used component lists as templates for quick access. Templates are stored locally.',
  liveOutput: 'Real-time logs from the research pipeline. Shows progress through each stage including research, debate, review, and paper generation.',
  progressBar: 'Current progress through the research pipeline. Shows the active stage, node, and cycle.',
  
  // Results
  resultsTree: 'Browse completed research runs organized by component and timestamp. Click a run to view its details.',
  exportZip: 'Download all run files (JSON, markdown) as a ZIP archive.',
  exportMarkdown: 'Export a formatted markdown report summarizing the research findings.',
  copySummary: 'Copy a shareable summary of the research results to your clipboard.',
  
  // Settings - API Keys
  openaiKey: 'Your OpenAI API key for GPT-5.1 access. Required for most pipeline stages.',
  geminiKey: 'Your Google Gemini API key. Used for Agent B and alternating debate rounds.',
  tavilyKey: 'Optional Tavily API key for web and academic search. Enables deep research capabilities.',
  
  // Settings - Email
  emailNotifications: 'Receive email notifications when research runs complete or encounter errors.',
  smtpServer: 'SMTP server address. Use smtp.gmail.com for Gmail.',
  smtpPort: 'SMTP port number. Use 587 for TLS (recommended) or 465 for SSL.',
  appPassword: 'For Gmail, use an App Password instead of your regular password. Enable 2FA first, then create an App Password.',
  
  // Settings - Deep Research
  deepResearch: 'Enable web and academic search during research rounds. Uses Tavily API for grounded, factual research.',
  queriesPerRound: 'Number of search queries to run per research round. More queries = better coverage but higher cost.',
  
  // Settings - Advanced
  parallelExecution: 'Run independent LLM operations in parallel for faster completion. Disable if you hit rate limits.',
  checkpointing: 'Save progress during runs to enable resuming if interrupted. Recommended for long research sessions.',
  
  // Settings - Appearance
  themeToggle: 'Switch between dark and light themes. Your preference is saved automatically.',
};
