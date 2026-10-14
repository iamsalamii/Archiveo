'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ColorBadge } from '@/components/shared/color-badge';
import { useParameters } from '@/contexts/parameters-context';
import { useI18n } from '@/contexts/i18n-context';
import {
  fetchCorrespondences,
  deleteCorrespondence,
  CorrespondenceApi,
} from '@/services/correspondence-api';
import { CorrespondenceFormDialog } from '@/components/correspondence/correspondence-form-dialog';
import { Mail, ArrowDownLeft, ArrowUpRight, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CorrespondencePage() {
  const { t } = useI18n();
  const { getItemName, getItem } = useParameters();
  const [correspondences, setCorrespondences] = useState<CorrespondenceApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CorrespondenceApi | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await fetchCorrespondences();
      setCorrespondences(list);
    } catch {
      if (!silent) toast.error('Impossible de charger les courriers');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous supprimer ce courrier ?')) return;
    const previous = [...correspondences];
    // Optimistic UI
    setCorrespondences((prev) => prev.filter((c) => c.id !== id));
    toast.success('Courrier supprimé');
    try {
      await deleteCorrespondence(id);
      load(true);
    } catch {
      setCorrespondences(previous);
      toast.error('Erreur lors de la suppression');
    }
  };

  const incoming = correspondences.filter((c) => c.type === 'incoming');
  const outgoing = correspondences.filter((c) => c.type === 'outgoing');
  const internal = correspondences.filter((c) => c.type === 'internal');

  const currentTabList = useMemo(() => {
    switch (activeTab) {
      case 'incoming':
        return incoming;
      case 'outgoing':
        return outgoing;
      case 'internal':
        return internal;
      default:
        return correspondences;
    }
  }, [activeTab, incoming, outgoing, internal, correspondences]);

  const exportData = useMemo(() => {
    const typeLabels: Record<string, string> = {
      incoming: 'Entrant',
      outgoing: 'Sortant',
      internal: 'Interne',
    };
    return currentTabList.map((row) => ({
      Référence: row.reference,
      Type: typeLabels[row.type] || row.type,
      Objet: row.subject,
      Expéditeur: (getItemName('PRODUCER', row.senderId) || row.senderId) || '—',
      Destinataire: (getItemName('RECIPIENT', row.recipientId) || row.recipientId) || '—',
      Date: row.date ? new Date(row.date).toLocaleDateString('fr-FR') : '—',
      Signature: (getItemName('SIGNATURE_TYPE', row.signatureTypeId) || row.signatureTypeId) || '—',
    }));
  }, [currentTabList, getItemName]);

  const columns: Column<CorrespondenceApi>[] = useMemo(
    () => [
      {
        key: 'reference',
        label: 'Référence',
        render: (row) => <span className="font-mono text-xs font-semibold">{row.reference}</span>,
        exportValue: (row) => row.reference,
      },
      {
        key: 'type',
        label: 'Type',
        render: (row) => {
          const colors: Record<string, string> = { incoming: 'blue', outgoing: 'amber', internal: 'emerald' };
          const labels: Record<string, string> = { incoming: 'Entrant', outgoing: 'Sortant', internal: 'Interne' };
          return <ColorBadge name={labels[row.type] || row.type} color={colors[row.type]} />;
        },
        exportValue: (row) => row.type,
      },
      {
        key: 'subject',
        label: 'Objet',
        render: (row) => <span className="font-medium">{row.subject}</span>,
        exportValue: (row) => row.subject,
      },
      {
        key: 'senderId',
        label: 'Expéditeur',
        render: (row) => getItemName('PRODUCER', row.senderId) || row.senderId || '—',
        exportValue: (row) => getItemName('PRODUCER', row.senderId) || row.senderId,
      },
      {
        key: 'recipientId',
        label: 'Destinataire',
        render: (row) => getItemName('RECIPIENT', row.recipientId) || row.recipientId || '—',
        exportValue: (row) => getItemName('RECIPIENT', row.recipientId) || row.recipientId,
      },
      {
        key: 'date',
        label: 'Date',
        render: (row) => <span className="text-xs font-mono">{new Date(row.date).toLocaleDateString('fr-FR')}</span>,
        exportValue: (row) => new Date(row.date).toLocaleDateString('fr-FR'),
      },
      {
        key: 'signatureTypeId',
        label: 'Signature',
        render: (row) => getItemName('SIGNATURE_TYPE', row.signatureTypeId) || row.signatureTypeId || '—',
        exportValue: (row) => getItemName('SIGNATURE_TYPE', row.signatureTypeId) || row.signatureTypeId,
      },
      {
        key: 'id',
        label: 'Actions',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row);
                setFormOpen(true);
              }}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
              title="Supprimer"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [getItemName, getItem]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('correspondence.title', 'Courriers & Flux')}
        subtitle={t('correspondence.subtitle', 'Gestion, enregistrement et traçabilité des correspondances officielles')}
        icon={<Mail className="h-6 w-6" />}
        exportData={exportData}
        exportFilename={`registre-courriers-${activeTab}`}
        exportTitle={`${t('correspondence.title', 'Registre des Courriers')} (${activeTab.toUpperCase()})`}
        exportColumns={[
          { key: 'Référence', label: t('common.reference', 'Référence') },
          { key: 'Type', label: t('common.type', 'Type de courrier') },
          { key: 'Objet', label: t('correspondence.subject', 'Objet du courrier') },
          { key: 'Expéditeur', label: t('correspondence.sender', 'Expéditeur') },
          { key: 'Destinataire', label: t('correspondence.recipient', 'Destinataire') },
          { key: 'Date', label: t('common.date', 'Date d’enregistrement') },
          { key: 'Signature', label: 'Mode de signature' },
        ]}
        exportMetadata={{
          subtitle: 'Registre chronologique des correspondances officielles',
          filterSummary: `${currentTabList.length} courrier(s) affiché(s)`,
        }}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> {t('correspondence.new', 'Nouveau courrier')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Entrants', count: incoming.length, icon: ArrowDownLeft, colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
          { label: 'Sortants', count: outgoing.length, icon: ArrowUpRight, colorClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
          { label: 'Internes', count: internal.length, icon: RefreshCw, colorClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.colorClass}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-xs text-muted-foreground">Courriers {stat.label.toLowerCase()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Tous ({correspondences.length})</TabsTrigger>
          <TabsTrigger value="incoming">Entrants ({incoming.length})</TabsTrigger>
          <TabsTrigger value="outgoing">Sortants ({outgoing.length})</TabsTrigger>
          <TabsTrigger value="internal">Internes ({internal.length})</TabsTrigger>
        </TabsList>
        {[
          { key: 'all', data: correspondences },
          { key: 'incoming', data: incoming },
          { key: 'outgoing', data: outgoing },
          { key: 'internal', data: internal },
        ].map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <Card>
              <CardContent className="pt-6">
                <DataTable
                  data={tab.data as unknown as Record<string, unknown>[]}
                  columns={columns as unknown as Column<Record<string, unknown>>[]}
                  loading={loading}
                  exportFilename={`courriers-${tab.key}`}
                  exportTitle="Liste des courriers"
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <CorrespondenceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        correspondence={editing}
        onSaved={() => load(true)}
      />
    </div>
  );
}
