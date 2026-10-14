'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useParameters } from '@/contexts/parameters-context';
import { useI18n } from '@/contexts/i18n-context';
import {
    fetchArchives,
    deleteArchive,
    ArchiveApi,
} from '@/services/archives-api';
import { ArchiveFormDialog } from '@/components/archives/archive-form-dialog';
import { ArchiveTransitionDialog } from '@/components/archives/archive-transition-dialog';
import { Archive, Plus, Search, Trash2, Pencil, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function statusVariant(status: string) {
    switch (status) {
        case 'CURRENT': return 'default' as const;
        case 'INTERMEDIATE': return 'secondary' as const;
        case 'FINAL': return 'outline' as const;
        case 'DESTROYED': return 'destructive' as const;
        default: return 'outline' as const;
    }
}

export default function ArchivesPage() {
    const { t } = useI18n();
    const { getItemName, getItems } = useParameters();
    const [archives, setArchives] = useState<ArchiveApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const statusLabel = useCallback((status: string) => {
        switch (status) {
            case 'CURRENT': return t('archives.current', 'Courante');
            case 'INTERMEDIATE': return t('archives.intermediate', 'Intermédiaire');
            case 'FINAL': return t('archives.definitive', 'Définitive');
            case 'DESTROYED': return t('archives.destroyed', 'Détruite');
            default: return status;
        }
    }, [t]);
    const [formOpen, setFormOpen] = useState(false);
    const [transitionOpen, setTransitionOpen] = useState(false);
    const [editing, setEditing] = useState<ArchiveApi | null>(null);
    const [transitioning, setTransitioning] = useState<ArchiveApi | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchArchives();
            setArchives(data);
        } catch {
            if (!silent) toast.error('Impossible de charger les archives');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        return archives.filter((a) => {
            const matchSearch =
                a.title.toLowerCase().includes(search.toLowerCase()) ||
                a.reference.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || a.status === statusFilter;
            const matchType = typeFilter === 'all' || a.typeId === typeFilter;
            return matchSearch && matchStatus && matchType;
        });
    }, [archives, search, statusFilter, typeFilter]);

    const exportData = useMemo(() => {
        return filtered.map((a) => ({
            Référence: a.reference,
            Titre: a.title,
            Type: getItemName('ARCHIVE_TYPE', a.typeId) || a.typeId,
            Statut: statusLabel(a.status),
            'Date archivage': a.archivedAt ? formatDate(a.archivedAt) : '—',
            'Date rétention': a.retentionDate ? formatDate(a.retentionDate) : '—',
            Emplacement: a.locationId || '—',
            Description: a.description || '—',
        }));
    }, [filtered, getItemName]);

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette archive ?')) return;
        const previousArchives = [...archives];
        // Optimistic UI
        setArchives((prev) => prev.filter((a) => a.id !== id));
        toast.success('Archive supprimée');
        try {
            await deleteArchive(id);
            load(true);
        } catch {
            setArchives(previousArchives);
            toast.error('Erreur lors de la suppression');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('archives.title', 'Archives & Versements')}
                subtitle={t('archives.subtitle', 'Gestion du cycle de vie des archives (Courantes, Intermédiaires, Définitives, Destruction)')}
                icon={<Archive className="h-6 w-6" />}
                exportData={exportData}
                exportFilename="registre-archives"
                exportTitle={t('archives.title', 'Registre Général des Archives')}
                exportColumns={[
                    { key: 'Référence', label: t('common.reference', 'Référence') },
                    { key: 'Titre', label: t('common.title', 'Titre de l’archive') },
                    { key: 'Type', label: t('common.type', 'Type') },
                    { key: 'Statut', label: t('common.status', 'Statut') },
                    { key: 'Date archivage', label: t('common.date', 'Date archivage') },
                    { key: 'Date rétention', label: t('archives.retentionDate', 'Date fin de rétention') },
                    { key: 'Emplacement', label: t('common.location', 'Emplacement') },
                ]}
                exportMetadata={{
                    subtitle: 'État d’inventaire et de conservation des archives',
                    filterSummary: `${filtered.length} archive(s) répertoriée(s)`,
                }}
                actions={
                    <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
                        <Plus className="h-4 w-4" /> {t('archives.new', 'Nouvelle archive')}
                    </Button>
                }
            />

            {/* Filtres */}
            <Card>
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('archives.searchPlaceholder', 'Rechercher...')}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue placeholder={t('common.status', 'Statut')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('docs.filterStatus', 'Tous les statuts')}</SelectItem>
                            <SelectItem value="CURRENT">{t('archives.current', 'Courante')}</SelectItem>
                            <SelectItem value="INTERMEDIATE">{t('archives.intermediate', 'Intermédiaire')}</SelectItem>
                            <SelectItem value="FINAL">{t('archives.definitive', 'Définitive')}</SelectItem>
                            <SelectItem value="DESTROYED">{t('archives.destroyed', 'Détruite')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les types</SelectItem>
                            {getItems('ARCHIVE_TYPE').map((i) => (
                                <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                        {filtered.length} archive(s)
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Référence</TableHead>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Date archivage</TableHead>
                                    <TableHead>Rétention</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            Aucune archive trouvée
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((a) => (
                                        <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-mono text-xs font-semibold">{a.reference}</TableCell>
                                            <TableCell className="font-medium">{a.title}</TableCell>
                                            <TableCell>{getItemName('ARCHIVE_TYPE', a.typeId)}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant(a.status)}>
                                                    {statusLabel(a.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">{formatDate(a.archivedAt)}</TableCell>
                                            <TableCell className="text-xs">
                                                {a.retentionDate ? formatDate(a.retentionDate) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setTransitioning(a); setTransitionOpen(true); }}
                                                        title="Changer le statut"
                                                    >
                                                        <ArrowRight className="h-4 w-4 text-primary" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setEditing(a); setFormOpen(true); }}
                                                        title="Modifier"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(a.id)}
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ArchiveFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                archive={editing}
                onSaved={() => load(true)}
            />

            <ArchiveTransitionDialog
                open={transitionOpen}
                onOpenChange={setTransitionOpen}
                archive={transitioning}
                onSaved={() => load(true)}
            />
        </div>
    );
}