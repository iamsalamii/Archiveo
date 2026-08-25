'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExportMenu } from '@/components/shared/export-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  Table as TableIcon,
  Printer,
  CheckSquare,
  Square,
} from 'lucide-react';
import { printDataReport } from '@/utils/export';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/types';
import { toast } from 'sonner';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  exportValue?: (row: T) => string | number;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  title?: string;
  exportFilename?: string;
  exportTitle?: string;
  toolbar?: ReactNode;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  cardRender?: (row: T) => ReactNode;
  selectable?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchKeys,
  pageSize = 10,
  title,
  exportFilename = 'export',
  exportTitle = 'Export',
  toolbar,
  emptyMessage = 'Aucune donnée',
  onRowClick,
  cardRender,
  selectable = true,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'table' | 'list' | 'card'>('table');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    const keys = searchKeys ?? columns.map((c) => c.key);
    return data.filter((row) =>
      keys.some((k) => String((row as Record<string, unknown>)[k as string] ?? '').toLowerCase().includes(q))
    );
  }, [data, search, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey as string];
      const bv = (b as Record<string, unknown>)[sortKey as string];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === sorted.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(sorted.map((_, i) => i)));
    }
  };

  const toggleSelectRow = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const exportColumns = columns
    .filter((c) => c.exportValue || c.key)
    .map((c) => ({
      key: c.key,
      label: c.label,
    }));

  const exportData = sorted.map((row) => {
    const out: Record<string, unknown> = {};
    columns.forEach((c) => {
      out[c.label] = c.exportValue ? c.exportValue(row) : String((row as Record<string, unknown>)[c.key as string] ?? '');
    });
    return out;
  });

  const handlePrintSelected = () => {
    const selectedRows = sorted.filter((_, i) => selectedIndices.has(i));
    if (selectedRows.length === 0) {
      toast.error('Veuillez sélectionner au moins un élément à imprimer.');
      return;
    }

    const printFormatted = selectedRows.map((row) => {
      const itemOut: Record<string, unknown> = {};
      columns.forEach((c) => {
        itemOut[c.label] = c.exportValue ? c.exportValue(row) : String((row as Record<string, unknown>)[c.key as string] ?? '—');
      });
      return itemOut;
    });

    const isSingle = selectedRows.length === 1;
    printDataReport(
      printFormatted,
      isSingle ? `Fiche d’enregistrement — ${exportTitle}` : `Bordereau officiel — ${exportTitle} (${selectedRows.length} éléments)`,
      undefined,
      {
        subtitle: isSingle ? 'Fiche individuelle extraite du système Archivéo' : `Sélection de ${selectedRows.length} enregistrements`,
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Recherche instantanée..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8 text-xs"
              />
            </div>
          )}
          {cardRender && (
            <div className="hidden items-center gap-1 rounded-md border p-0.5 sm:flex">
              <Button
                size="icon"
                variant={view === 'table' ? 'secondary' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setView('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={view === 'list' ? 'secondary' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={view === 'card' ? 'secondary' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setView('card')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIndices.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintSelected}
              className="gap-1.5 text-xs text-primary border-primary/40 bg-primary/5 hover:bg-primary/10 shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimer {selectedIndices.size === 1 ? 'la fiche' : `sélection (${selectedIndices.size})`}</span>
            </Button>
          )}
          {toolbar}
          <ExportMenu data={exportData} filename={exportFilename} title={exportTitle} columns={undefined} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : view === 'card' && cardRender ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageData.map((row, i) => (
            <div key={i} onClick={() => onRowClick?.(row)} className="cursor-pointer">
              {cardRender(row)}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {selectable && (
                  <TableHead className="w-10 px-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Tout sélectionner / désélectionner"
                    >
                      {selectedIndices.size === sorted.length && sorted.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={String(col.key)} style={{ width: col.width }} className="text-xs font-bold">
                    {col.sortable !== false ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-24 text-center text-muted-foreground text-xs">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((row, i) => {
                  const globalIdx = page * pageSize + i;
                  const isSelected = selectedIndices.has(globalIdx);
                  return (
                    <TableRow
                      key={globalIdx}
                      className={cn(
                        onRowClick && 'cursor-pointer hover:bg-muted/40 transition-colors',
                        isSelected && 'bg-primary/5'
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell className="w-10 px-3" onClick={(e) => toggleSelectRow(globalIdx, e)}>
                          <button
                            type="button"
                            className="flex items-center justify-center text-muted-foreground hover:text-primary"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/60" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={String(col.key)} className="text-xs py-2.5">
                          {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <p className="text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} sur {sorted.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="text-xs h-7"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs h-7"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
