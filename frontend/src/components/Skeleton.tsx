import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ 
  className, 
  variant = 'rectangular',
  width,
  height,
  lines = 1
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-surface-hover';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(baseClasses, variantClasses[variant], className)}
            style={{ 
              ...style, 
              width: i === lines - 1 ? '75%' : style.width 
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  );
}

// Pre-built skeleton patterns for common UI elements
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-surface rounded-xl border border-border p-5', className)}>
      <Skeleton variant="text" width="40%" className="mb-3" />
      <Skeleton variant="text" width="60%" height={32} />
    </div>
  );
}

export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-3 p-4', className)}>
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="text" width="60%" className="mb-2" />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  );
}

export function SkeletonInput({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-2', className)}>
      <Skeleton variant="text" width={100} height={16} />
      <Skeleton variant="rectangular" height={42} className="w-full" />
    </div>
  );
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton 
      variant="rectangular" 
      height={40} 
      className={clsx('w-full', className)} 
    />
  );
}

export function SkeletonTreeItem({ depth = 0 }: { depth?: number }) {
  return (
    <div 
      className="flex items-center gap-2 px-3 py-2"
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
    >
      <Skeleton variant="rectangular" width={16} height={16} />
      <Skeleton variant="rectangular" width={16} height={16} />
      <Skeleton variant="text" width="60%" />
    </div>
  );
}

export default Skeleton;
