'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { fetchAuditLogs, AuditLogApi } from '@/services/audit-api';
import {
    History,
    Search,
    RefreshCw,
    Activity,
    Users,
    AlertTriangle,
    ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function methodVariant(method: string) {
    switch (method) {
        case 'GET': return 'secondary' as const;
        case 'POST': return 'default' as const;
        case 'PUT': return 'outline' as const;
        case 'DELETE': return 'destructive' as const;
        default: return 'outline' as const;
    }
}

function methodColor(method: string) {
    switch (method) {
        case 'GET': return 'text-blue-600 dark:text-blue-400';
        case 'POST': return 'text-emerald-600 dark:text-emerald-400';
        case 'PUT': return 'text-amber-600 dark:text-amber-400';
        case 'DELETE': return 'text-red-600 dark:text-red-400';
        default: return 'text-muted-foreground';
    }
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLogApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAuditLogs(500);
            setLogs(data);
        } catch (e) {
            toast.error('Impossible de charger le journal d\'audit');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        return logs.filter((l) => {
            const matchSearch =
                l.userName.toLowerCase().includes(search.toLowerCase()) ||
                l.target.toLowerCase().includes(search.toLowerCase()) ||
                l.ipAddress.includes(search);
            const matchMethod = methodFilter === 'all' || l.action === methodFilter;
            const matchStatus =
                statusFilter === 'all' ||
                (statusFilter === 'success' && l.statusCode < 400) ||
                (statusFilter === 'error' && l.statusCode >= 400);
            return matchSearch && matchMethod && matchStatus;
        });
    }, [logs, search, methodFilter, statusFilter]);

    const stats = useMemo(() => {
        const uniqueUsers = new Set(logs.map((l) => l.userName)).size;
        const errors = logs.filter((l) => l.statusCode >= 400).length;
        const writes = logs.filter((l) => l.action !== 'GET').length;
        return [
            { label: 'Actions totales', value: logs.length, icon: Activity, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400' },
            { label: 'Utilisateurs actifs', value: uniqueUsers, icon: Users, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400' },
            { label: 'Modifications', value: writes, icon: ShieldCheck, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400' },
            { label: 'Erreurs', value: errors, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400' },
        ];
    }, [logs]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Journal d'audit"
                subtitle="Traçabilité complète des actions, accès et modifications du système"
                icon={<History className="h-6 w-6" />}
                exportData={filtered.map((l) => ({
                    'Date & Heure': formatDateTime(l.timestamp),
                    Utilisateur: l.userName,
                    Action: l.action,
                    Cible: l.target,
                    'Statut HTTP': l.statusCode,
                    'Adresse IP': l.ipAddress,
                    'Type cible': l.targetType,
                }))}
                exportFilename="journal-audit-archiveo"
                exportTitle="Journal Officiel d'Audit et de Traçabilité"
                exportColumns={[
                    { key: 'Date & Heure', label: 'Date & Heure' },
                    { key: 'Utilisateur', label: 'Utilisateur' },
                    { key: 'Action', label: 'Méthode / Action' },
                    { key: 'Cible', label: 'Ressource cible' },
                    { key: 'Statut HTTP', label: 'Statut' },
                    { key: 'Adresse IP', label: 'Adresse IP' },
                ]}
                exportMetadata={{
                    subtitle: 'Rapport de sécurité et d’intégrité du système',
                    filterSummary: `${filtered.length} événement(s) filtré(s)`,
                }}
                actions={
                    <Button variant="outline" onClick={load} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Actualiser
                    </Button>
                }
            />

            {/* Statistiques */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <Card key={s.label}>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold leading-none">{s.value}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Filtres */}
            <Card>
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher (utilisateur, cible, IP)..."
                            className="pl-9"
                        />
                    </div>
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                        <SelectTrigger><SelectValue placeholder="Méthode" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes les méthodes</SelectItem>
                            <SelectItem value="GET">GET (lecture)</SelectItem>
                            <SelectItem value="POST">POST (création)</SelectItem>
                            <SelectItem value="PUT">PUT (modification)</SelectItem>
                            <SelectItem value="DELETE">DELETE (suppression)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue placeholder="Résultat" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les résultats</SelectItem>
                            <SelectItem value="success">Succès (&lt; 400)</SelectItem>
                            <SelectItem value="error">Erreurs (≥ 400)</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                        <span>Historique des actions</span>
                        <Badge variant="secondary">{filtered.length} entrée(s)</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                        </div>
                    ) : (
                        <div className="max-h-[600px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card">
                                    <TableRow>
                                        <TableHead>Horodatage</TableHead>
                                        <TableHead>Utilisateur</TableHead>
                                        <TableHead>Méthode</TableHead>
                                        <TableHead>Cible</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Adresse IP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                                Aucune entrée dans le journal
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((l) => (
                                            <TableRow key={l.id}>
                                                <TableCell className="whitespace-nowrap font-mono text-xs">
                                                    {formatDateTime(l.timestamp)}
                                                </TableCell>
                                                <TableCell className="font-medium">{l.userName}</TableCell>
                                                <TableCell>
                                                    <Badge variant={methodVariant(l.action)} className={methodColor(l.action)}>
                                                        {l.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="text-sm">{l.target}</p>
                                                        <p className="text-xs text-muted-foreground">{l.targetType}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={l.statusCode >= 400 ? 'destructive' : 'secondary'}
                                                        className="font-mono"
                                                    >
                                                        {l.statusCode}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{l.ipAddress}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}