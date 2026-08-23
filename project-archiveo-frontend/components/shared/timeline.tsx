'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, Circle } from 'lucide-react';

interface TimelineStep {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  icon?: React.ReactNode;
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950', line: 'bg-emerald-500' },
  current: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', line: 'bg-blue-500' },
  pending: { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted', line: 'bg-muted' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950', line: 'bg-red-500' },
};

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, i) => {
        const config = statusConfig[step.status];
        const Icon = config.icon;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', config.bg)}>
                {step.icon ?? <Icon className={cn('h-4 w-4', config.color)} />}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-0.5 flex-1 min-h-[2rem]', config.line)} />
              )}
            </div>
            <div className="flex-1 pb-6">
              <p className="text-sm font-medium">{step.title}</p>
              {step.subtitle && <p className="text-xs text-muted-foreground">{step.subtitle}</p>}
              {step.date && <p className="text-xs text-muted-foreground/70 mt-0.5">{step.date}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
