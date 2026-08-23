'use client';

import { getIcon } from '@/utils/icons';
import type { LucideIcon } from 'lucide-react';

// Tailwind-safe color classes for parameter badges.
const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function getColorClasses(color?: string): string {
  return colorMap[color ?? 'slate'] ?? colorMap.slate;
}

export function ColorBadge({
  name,
  color,
  icon,
  size = 'sm',
}: {
  name: string;
  color?: string;
  icon?: string;
  size?: 'sm' | 'md';
}) {
  const Icon: LucideIcon = getIcon(icon);
  const cls = getColorClasses(color);
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${cls} ${padding}`}
    >
      <Icon className="h-3 w-3" />
      {name}
    </span>
  );
}
