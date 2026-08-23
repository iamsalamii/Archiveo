'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileJson, FileCode, Printer, ChevronDown } from 'lucide-react';
import { exportToCsv, exportToJson, exportToXml, exportToExcel, exportToPdf, printDataReport, type ExportColumn, type ReportMetadata } from '@/utils/export';

interface ExportMenuProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  title: string;
  columns?: ExportColumn<T>[];
  label?: string;
  className?: string;
  metadata?: ReportMetadata;
}

export function ExportMenu<T extends Record<string, unknown> = Record<string, unknown>>({
  data,
  filename,
  title,
  columns,
  label = 'Exporter / Imprimer',
  className,
  metadata,
}: ExportMenuProps<T>) {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    printDataReport(data, title, columns, metadata);
  };

  const handlePdf = () => {
    exportToPdf(data, title, columns, metadata);
  };

  const handleExcel = () => {
    exportToExcel(data, filename, columns);
  };

  const handleCsv = () => {
    exportToCsv(data, filename, columns);
  };

  const handleJson = () => {
    exportToJson(data, filename);
  };

  const handleXml = () => {
    exportToXml(data, filename);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 h-9 px-3 font-medium shadow-sm hover:border-primary/50 transition-all ${className || ''}`}>
          <Download className="h-4 w-4 text-primary" />
          <span>{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-slate-200 dark:border-slate-800">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
          Options d'exportation & impression
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        
        <DropdownMenuItem onClick={handlePdf} className="cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted">
          <FileText className="mr-2.5 h-4 w-4 text-rose-500" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Document PDF</span>
            <span className="text-[10px] text-muted-foreground">Rapport vectoriel structuré</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExcel} className="cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted">
          <FileSpreadsheet className="mr-2.5 h-4 w-4 text-emerald-600" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Tableur Excel (.xlsx)</span>
            <span className="text-[10px] text-muted-foreground">Feuille de calcul exploitable</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCsv} className="cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted">
          <FileText className="mr-2.5 h-4 w-4 text-blue-500" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Fichier CSV (UTF-8)</span>
            <span className="text-[10px] text-muted-foreground">Données brutes délimitées</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleJson} className="cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted">
          <FileJson className="mr-2.5 h-4 w-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Données JSON</span>
            <span className="text-[10px] text-muted-foreground">Structure objet standard</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleXml} className="cursor-pointer py-2 px-2.5 rounded-md hover:bg-muted">
          <FileCode className="mr-2.5 h-4 w-4 text-purple-500" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Données XML</span>
            <span className="text-[10px] text-muted-foreground">Format balisé universel</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem onClick={handlePrint} className="cursor-pointer py-2 px-2.5 rounded-md bg-primary/5 hover:bg-primary/10 text-primary font-medium">
          <Printer className="mr-2.5 h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-primary">Imprimer l'état / Rapport</span>
            <span className="text-[10px] text-primary/70">Mise en page officielle A4</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
