'use client';

import type { ReactNode } from 'react';
import { ExportMenu } from '@/components/shared/export-menu';
import type { ExportColumn, ReportMetadata } from '@/utils/export';

interface PageHeaderProps<T extends Record<string, unknown> = Record<string, unknown>> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  exportData?: T[];
  exportFilename?: string;
  exportTitle?: string;
  exportColumns?: ExportColumn<T>[];
  exportMetadata?: ReportMetadata;
  showExport?: boolean;
}

export function PageHeader<T extends Record<string, unknown> = Record<string, unknown>>({
  title,
  subtitle,
  icon,
  actions,
  exportData,
  exportFilename,
  exportTitle,
  exportColumns,
  exportMetadata,
  showExport = true,
}: PageHeaderProps<T>) {
  const effectiveData = exportData && exportData.length > 0 ? exportData : [
    { Module: title, Description: subtitle || 'Page du système Archivéo', Statut: 'Actif', 'Date d’édition': new Date().toLocaleDateString('fr-FR') }
  ];

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm border border-primary/20">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {actions}
        {showExport && (
          <ExportMenu
            data={effectiveData as Record<string, unknown>[]}
            filename={exportFilename || title.toLowerCase().replace(/\s+/g, '-')}
            title={exportTitle || title}
            columns={exportColumns as ExportColumn<Record<string, unknown>>[]}
            metadata={{
              subtitle: subtitle,
              ...exportMetadata,
            }}
          />
        )}
      </div>
    </div>
  );
}
