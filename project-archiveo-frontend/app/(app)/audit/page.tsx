'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  CheckCircle2,
  Lock,
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

// Convertit les métadonnées techniques en événement métier compréhensible et sécurisé
function formatBusinessAction(log: AuditLogApi): { module: string; description: string; isSuccess: boolean } {
  const isSuccess = log.statusCode < 400;
  const targetLower = (log.target || '').toLowerCase();
  const method = (log.action || '').toUpperCase();

  let module = 'Système';
  let description = 'Activité générale';

  if (targetLower.includes('auth') || targetLower.includes('login')) {
    module = 'Sécurité & Accès';
    description = method === 'POST' ? (isSuccess ? 'Connexion utilisateur réussie' : 'Tentative de connexion refusée') : 'Vérification de session';
  } else if (targetLower.includes('doc')) {
    module = 'Documents GED';
    description = method === 'POST' ? 'Création d’un nouveau document' : method === 'PUT' ? 'Modification de document' : method === 'DELETE' ? 'Suppression de document' : 'Consultation documentaire';
  } else if (targetLower.includes('archive')) {
    module = 'Archives & Versements';
    description = method === 'POST' ? 'Enregistrement d’un versement d’archives' : method === 'PUT' ? 'Transition d’âge d’archive' : method === 'DELETE' ? 'Destruction / Retrait d’archive' : 'Consultation du registre des archives';
  } else if (targetLower.includes('loan')) {
    module = 'Prêts & Consultations';
    description = method === 'POST' ? 'Enregistrement d’un prêt de document' : method === 'PUT' ? 'Prolongation ou retour de prêt' : 'Consultation des communications';
  } else if (targetLower.includes('workflow')) {
    module = 'Circuits de Validation';
    description = method === 'POST' ? 'Création d’un circuit de validation' : method === 'PUT' ? 'Visa / Décision d’étape de workflow' : 'Consultation des circuits';
  } else if (targetLower.includes('signature')) {
    module = 'Parapheur Électronique';
    description = method === 'POST' ? 'Signature électronique / Envoi parapheur' : 'Vérification de signature';
  } else if (targetLower.includes('user') || targetLower.includes('role')) {
    module = 'Gestion des Utilisateurs';
    description = method === 'POST' ? 'Création d’un profil utilisateur' : method === 'PUT' ? 'Mise à jour des droits et rôles' : method === 'DELETE' ? 'Désactivation d’utilisateur' : 'Consultation de l’annuaire';
  } else if (targetLower.includes('parameter') || targetLower.includes('outil')) {
    module = 'Paramétrage & Outils';
    description = method === 'POST' || method === 'PUT' ? 'Modification des tables de référence' : method === 'DELETE' ? 'Suppression d’un paramètre' : 'Consultation des paramètres';
  } else {
    module = log.targetType || 'Général';
    description = isSuccess ? 'Opération métier validée' : 'Action non autorisée ou rejetée';
  }

  return { module, description, isSuccess };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs(500);
      setLogs(data);
    } catch {
      toast.error('Impossible de charger le journal d\'audit');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const transformedLogs = useMemo(() => {
    return logs.map((l) => {
      const { module, description, isSuccess } = formatBusinessAction(l);
      return {
        ...l,
        businessModule: module,
        businessDescription: description,
        businessSuccess: isSuccess,
      };
    });
  }, [logs]);

  const filtered = useMemo(() => {
    return transformedLogs.filter((l) => {
      const matchSearch =
        l.userName.toLowerCase().includes(search.toLowerCase()) ||
        l.businessModule.toLowerCase().includes(search.toLowerCase()) ||
        l.businessDescription.toLowerCase().includes(search.toLowerCase());
      const matchModule = moduleFilter === 'all' || l.businessModule === moduleFilter;
      const matchResult =
        resultFilter === 'all' ||
        (resultFilter === 'success' && l.businessSuccess) ||
        (resultFilter === 'error' && !l.businessSuccess);
      return matchSearch && matchModule && matchResult;
    });
  }, [transformedLogs, search, moduleFilter, resultFilter]);

  const availableModules = useMemo(() => {
    return Array.from(new Set(transformedLogs.map((l) => l.businessModule)));
  }, [transformedLogs]);

  const stats = useMemo(() => {
    const uniqueUsers = new Set(logs.map((l) => l.userName)).size;
    const successes = transformedLogs.filter((l) => l.businessSuccess).length;
    const alerts = transformedLogs.filter((l) => !l.businessSuccess).length;
    return [
      { label: 'Événements tracés', value: logs.length, icon: Activity, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400' },
      { label: 'Utilisateurs actifs', value: uniqueUsers, icon: Users, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400' },
      { label: 'Opérations conformes', value: successes, icon: ShieldCheck, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400' },
      { label: 'Alertes / Rejets', value: alerts, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400' },
    ];
  }, [logs, transformedLogs]);

  const exportData = filtered.map((l, idx) => ({
    'N°': idx + 1,
    'Date & Heure': formatDateTime(l.timestamp),
    Utilisateur: l.userName,
    'Module Concerné': l.businessModule,
    'Action Réalisée': l.businessDescription,
    Résultat: l.businessSuccess ? 'Succès' : 'Échec / Rejet',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'audit & Traçabilité"
        subtitle="Registre sécurisé des activités, modifications et accès métier au système"
        icon={<History className="h-6 w-6" />}
        exportData={exportData}
        exportFilename="journal-audit-archiveo"
        exportTitle="Journal Officiel d'Audit et de Traçabilité Métier"
        exportColumns={[
          { key: 'Date & Heure', label: 'Date & Heure' },
          { key: 'Utilisateur', label: 'Utilisateur' },
          { key: 'Module Concerné', label: 'Module' },
          { key: 'Action Réalisée', label: 'Action Réalisée' },
          { key: 'Résultat', label: 'Résultat' },
        ]}
        exportMetadata={{
          subtitle: 'Rapport officiel d’intégrité et de traçabilité des opérations',
          filterSummary: `${filtered.length} événement(s) répertorié(s)`,
        }}
        actions={
          <Button variant="outline" onClick={load} className="gap-2 shadow-sm">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        }
      />

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm">
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

      {/* Filtres sécurisés */}
      <Card className="shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par utilisateur, module, description..."
              className="pl-9"
            />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger><SelectValue placeholder="Tous les modules" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les modules</SelectItem>
              {availableModules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger><SelectValue placeholder="Résultat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les résultats</SelectItem>
              <SelectItem value="success">Opérations Réussies</SelectItem>
              <SelectItem value="error">Alertes / Rejets</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table épurée et sécurisée */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-card pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Événements Enregistrés au Journal
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {filtered.length} entrée(s) authentifiée(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60">
                  <TableRow>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action Réalisée</TableHead>
                    <TableHead className="text-right">Résultat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Aucun événement correspondant
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((l) => (
                      <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {formatDateTime(l.timestamp)}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-foreground">
                          {l.userName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-medium">
                            {l.businessModule}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-foreground">
                          {l.businessDescription}
                        </TableCell>
                        <TableCell className="text-right">
                          {l.businessSuccess ? (
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold gap-1 text-[11px]">
                              <CheckCircle2 className="h-3 w-3" /> Conforme
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[11px]">
                              <AlertTriangle className="h-3 w-3" /> Rejeté
                            </Badge>
                          )}
                        </TableCell>
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