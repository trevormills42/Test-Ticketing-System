import { CheckCircle2, AlertTriangle, XCircle, Clock, PauseCircle, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  open: { label: 'Open', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: FolderOpen },
  in_progress: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: PauseCircle },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  closed: { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', icon: CheckCircle2 },
};

const priorityConfig = {
  low: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  high: { label: 'High', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  critical: { label: 'Critical', bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      config.bg,
      config.text,
      config.border,
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'resolved' || status === 'closed' ? 'bg-current' : 'bg-current')} />
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
      config.bg,
      config.text,
      config.border,
      className
    )}>
      {config.label}
    </span>
  );
}

interface SLAIndicatorProps {
  status: 'ok' | 'warning' | 'breached';
  deadline?: string;
  className?: string;
}

export function SLAIndicator({ status, deadline, className }: SLAIndicatorProps) {
  const config = {
    ok: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'On Track' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Warning' },
    breached: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Breached' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </span>
      <div>
        <span className={cn('text-xs font-medium', color)}>{label}</span>
        {deadline && (
          <p className="text-[11px] text-slate-400">
            {new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
