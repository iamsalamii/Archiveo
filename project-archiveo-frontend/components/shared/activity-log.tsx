'use client';

import { cn } from '@/lib/utils';
import { History, Globe, Monitor } from 'lucide-react';

interface ActivityLogEntry {
  id: string;
  date: string;
  user: string;
  action: string;
  target: string;
  ip?: string;
  browser?: string;
  details?: string;
  before?: string;
  after?: string;
}

interface ActivityLogProps {
  entries: ActivityLogEntry[];
  showBeforeAfter?: boolean;
  className?: string;
  maxItems?: number;
}

export function ActivityLog({ entries, showBeforeAfter, className, maxItems }: ActivityLogProps) {
  const items = maxItems ? entries.slice(0, maxItems) : entries;

  return (
    <div className={cn('space-y-2', className)}>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucune activité</p>
      ) : (
        items.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm">
                <span className="font-medium">{entry.user}</span>{' '}
                <span className="text-muted-foreground">— {entry.action}</span>{' '}
                <span className="font-medium">{entry.target}</span>
              </p>
              {entry.details && (
                <p className="text-xs text-muted-foreground">{entry.details}</p>
              )}
              {showBeforeAfter && (entry.before || entry.after) && (
                <div className="flex items-center gap-2 text-xs">
                  {entry.before && (
                    <span className="rounded bg-red-50 dark:bg-red-950 px-1.5 py-0.5 text-red-600 dark:text-red-400">
                      Avant: {entry.before}
                    </span>
                  )}
                  {entry.after && (
                    <span className="rounded bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
                      Après: {entry.after}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                <span>{new Date(entry.date).toLocaleString('fr-FR')}</span>
                {entry.ip && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {entry.ip}
                  </span>
                )}
                {entry.browser && (
                  <span className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> {entry.browser}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
