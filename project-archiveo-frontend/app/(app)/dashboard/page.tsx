'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useI18n } from '@/contexts/i18n-context';
import { useParameters } from '@/contexts/parameters-context';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/services/api';
import { getIcon } from '@/utils/icons';
import { ColorBadge } from '@/components/shared/color-badge';
import { cn } from '@/lib/utils';
import type { GedDocument, ArchiveRecord, ActivityLog, LoanRecord } from '@/types';
import {
  FileText,
  Archive,
  AlertTriangle,
  CheckCircle2,
  HandHelping,
  Trash2,
  TrendingUp,
  Activity,
  Users,
  Clock,
  RotateCcw,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const EvolutionAndTypeCharts = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((m) => m.EvolutionAndTypeCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px] w-full rounded-xl" />
        <Skeleton className="h-[340px] w-full rounded-xl" />
      </div>
    ),
  }
);

const ServiceBarChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((m) => m.ServiceBarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[340px] w-full rounded-xl" />,
  }
);

const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'];

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { getItemName, getItems } = useParameters();
  const [docs, setDocs] = useState<GedDocument[]>([]);
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Droits d'accès effectifs basés sur les rôles et permissions du profil connecté
  const canReadDocs = Boolean(user?.roles?.includes('Admin') || user?.permissions?.includes('documents.read'));
  const canReadArchives = Boolean(user?.roles?.includes('Admin') || user?.permissions?.includes('archives.read'));
  const canReadAudit = Boolean(user?.roles?.includes('Admin') || user?.permissions?.includes('audit.read'));
  const canReadLoans = Boolean(user?.roles?.includes('Admin') || user?.permissions?.includes('loans.read'));

  const loadDashboardData = useCallback(() => {
    setLoading(true);
    setError(null);

    // Ne solliciter les endpoints que si l'utilisateur possède la permission requise,
    // évitant ainsi les erreurs 403 et les mécanismes de repli vers des données fictives.
    const docsPromise = canReadDocs ? api.getDocuments() : Promise.resolve([]);
    const archivesPromise = canReadArchives ? api.getArchives() : Promise.resolve([]);
    const auditPromise = canReadAudit ? api.getActivityLog() : Promise.resolve([]);
    const loansPromise = canReadLoans ? api.getLoans() : Promise.resolve([]);

    Promise.all([docsPromise, archivesPromise, auditPromise, loansPromise])
      .then(([d, a, act, l]) => {
        setDocs(d);
        setArchives(a);
        setActivities(act);
        setLoans(l);
      })
      .catch((err) => {
        console.error('Erreur chargement données dashboard:', err);
        setError('Impossible de récupérer l’ensemble des données du tableau de bord. Veuillez vérifier votre connexion ou réessayer.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [canReadDocs, canReadArchives, canReadAudit, canReadLoans]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const kpis = useMemo(() => {
    const expired = docs.filter((d) => d.expiresAt && new Date(d.expiresAt) < new Date()).length;
    const toValidate = docs.filter((d) => !d.validated && d.statusId === 'BROUILLON').length;
    const borrowed = loans.filter((l) => l.status === 'active' || l.status === 'overdue').length;
    const destroyed = archives.filter((a) => a.status === 'destroyed').length;
    return [
      { label: t('dashboard.totalDocuments'), value: docs.length, icon: FileText, color: 'blue' },
      { label: t('dashboard.totalArchives'), value: archives.length, icon: Archive, color: 'violet' },
      { label: t('dashboard.expiredDocs'), value: expired, icon: AlertTriangle, color: 'red' },
      { label: t('dashboard.toValidate'), value: toValidate, icon: CheckCircle2, color: 'amber' },
      { label: t('dashboard.borrowed'), value: borrowed, icon: HandHelping, color: 'cyan' },
      { label: t('dashboard.destroyed'), value: destroyed, icon: Trash2, color: 'slate' },
    ];
  }, [docs, archives, loans, t]);

  // Évolution mensuelle calculée à partir des données réelles
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYear = new Date().getFullYear();

    return months.map((m, i) => {
      const docCount = docs.filter((d) => {
        if (!d.createdAt) return false;
        const dt = new Date(d.createdAt);
        return !isNaN(dt.getTime()) && dt.getMonth() === i && dt.getFullYear() === currentYear;
      }).length;

      const archCount = archives.filter((a) => {
        const rawDate = a.enteredAt || a.destructionDate;
        if (!rawDate) return false;
        const dt = new Date(rawDate);
        return !isNaN(dt.getTime()) && dt.getMonth() === i && dt.getFullYear() === currentYear;
      }).length;

      return {
        month: m,
        documents: docCount,
        archives: archCount,
      };
    });
  }, [docs, archives]);

  // Répartition par type documentaire (dynamique)
  const byTypeData = useMemo(() => {
    const typeGroups = getItems('DOC_TYPE');
    const map = new Map<string, { name: string; value: number }>();

    // Initialiser avec tous les types configurés
    typeGroups.forEach((t) => {
      map.set(t.code, { name: t.name || t.code, value: 0 });
    });

    // Compter les documents réels
    docs.forEach((d) => {
      const code = d.typeId || 'AUTRE';
      if (map.has(code)) {
        map.get(code)!.value += 1;
      } else {
        const label = getItemName('DOC_TYPE', code) || code;
        map.set(code, { name: label, value: 1 });
      }
    });

    const activeList = Array.from(map.values()).filter((d) => d.value > 0);
    // Si aucun document créé, afficher les types enregistrés avec valeur 0 pour la légende
    const listToDisplay = activeList.length > 0 ? activeList : typeGroups.slice(0, 5).map((t) => ({ name: t.name, value: 0 }));

    return listToDisplay.map((entry, i) => ({
      ...entry,
      color: chartColors[i % chartColors.length],
    }));
  }, [docs, getItems, getItemName]);

  // Répartition par Service (inclut TOUS les services ajoutés dans Paramètres / Outils)
  const byServiceData = useMemo(() => {
    const services = getItems('SERVICE');
    const map = new Map<string, { name: string; documents: number }>();

    // 1. Initialiser avec TOUS les services des paramètres
    services.forEach((s) => {
      map.set(s.code, { name: s.name || s.code, documents: 0 });
    });

    // 2. Agréger les documents par serviceId
    docs.forEach((d) => {
      if (d.serviceId && d.serviceId.trim() !== '') {
        if (map.has(d.serviceId)) {
          map.get(d.serviceId)!.documents += 1;
        } else {
          const label = getItemName('SERVICE', d.serviceId) || d.serviceId;
          map.set(d.serviceId, { name: label, documents: 1 });
        }
      } else {
        const unassigned = map.get('NON_ASSIGNE') || { name: 'Non assigné', documents: 0 };
        unassigned.documents += 1;
        map.set('NON_ASSIGNE', unassigned);
      }
    });

    // Retourner la liste ordonnée
    return Array.from(map.values()).sort((a, b) => b.documents - a.documents);
  }, [docs, getItems, getItemName]);

  const topUsers = useMemo(() => {
    const counts = new Map<string, number>();
    activities.forEach((a) => {
      // ✨ SÉCURITÉ : Vérifie que a.user existe avant de l'utiliser
      const userName = a.user || 'Utilisateur inconnu';
      counts.set(userName, (counts.get(userName) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [activities]);

  const dashboardExportData = useMemo(() => {
    return [
      ...docs.map((d) => ({
        Module: 'Documents GED',
        Reference: d.reference,
        Titre: d.title,
        Statut: d.statusId,
        Date: new Date(d.createdAt).toLocaleDateString('fr-FR'),
      })),
      ...archives.map((a) => ({
        Module: 'Archives',
        Reference: a.reference,
        Titre: a.documentTitle,
        Statut: a.status,
        Date: a.enteredAt ? new Date(a.enteredAt).toLocaleDateString('fr-FR') : '',
      })),
    ];
  }, [docs, archives]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        icon={<TrendingUp className="h-6 w-6" />}
        exportData={dashboardExportData}
        exportFilename="rapport-synthese-dashboard"
        exportTitle="Rapport Synthèse du Tableau de Bord"
        exportColumns={[
          { key: 'Module', label: 'Module' },
          { key: 'Reference', label: 'Référence' },
          { key: 'Titre', label: 'Intitulé / Titre' },
          { key: 'Statut', label: 'Statut' },
          { key: 'Date', label: 'Date d’enregistrement' },
        ]}
        exportMetadata={{
          subtitle: 'Vue consolidée des documents, archives et activités du système',
          filterSummary: 'Ensemble des entités actives',
        }}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            className="gap-2 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Actualiser les données
          </Button>
        }
      />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            className="shrink-0 border-destructive/40 hover:bg-destructive/15 text-destructive"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Réessayer
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const colorClasses: Record<string, string> = {
            blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
            violet: 'text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400',
            red: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
            amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
            cyan: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950 dark:text-cyan-400',
            slate: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
          };
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClasses[kpi.color]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{kpi.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <EvolutionAndTypeCharts
        monthlyData={monthlyData}
        byTypeData={byTypeData}
        titleEvolution={t('dashboard.monthlyEvolution')}
        titleByType={t('dashboard.byType')}
      />

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ServiceBarChart
          byServiceData={byServiceData}
          titleByService={t('dashboard.byService')}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              {t('dashboard.topUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">
                {canReadAudit
                  ? 'Aucune activité récente enregistrée.'
                  : 'Statistiques d’activité réservées aux profils de direction et d’audit.'}
              </div>
            ) : (
              topUsers.map((u, i) => (
                <div key={u.name} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                    i === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                    i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(u.name || '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.count} actions</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity — Conditionné aux droits d'audit */}
      {canReadAudit && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                {t('dashboard.recentActivity')}
              </CardTitle>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Journal d'événements
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {activities.slice(0, 8).map((act) => {
                const formatActivity = (action: string, target?: string) => {
                  const combined = `${action || ''} ${target || ''}`.toUpperCase();
                  const isPost = combined.includes('POST') || combined.includes('CREATE');
                  const isPut = combined.includes('PUT') || combined.includes('UPDATE');
                  const isDelete = combined.includes('DELETE') || combined.includes('REMOVE');
                  const isGet = combined.includes('GET') || combined.includes('FETCH');

                  if (combined.includes('AUTH') || combined.includes('LOGIN')) {
                    return { actionName: 'Connexion à la plateforme', pageName: 'Page Connexion', module: 'Sécurité', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' };
                  }
                  if (combined.includes('DOCUMENT')) {
                    const verb = isPost ? 'Création d’un document' : isPut ? 'Modification d’un document' : isDelete ? 'Suppression d’un document' : 'Consultation documentaire';
                    return { actionName: verb, pageName: 'Page Documents GED', module: 'Documents', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' };
                  }
                  if (combined.includes('USER')) {
                    const verb = isPost ? 'Création d’un compte utilisateur' : isPut ? 'Modification d’un utilisateur' : isDelete ? 'Suppression d’un utilisateur' : 'Consultation des utilisateurs';
                    return { actionName: verb, pageName: 'Page Utilisateurs', module: 'Utilisateurs', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' };
                  }
                  if (combined.includes('PARAMETER') || combined.includes('OUTIL')) {
                    const verb = isPost ? 'Ajout d’un nouveau paramètre' : isPut ? 'Mise à jour d’un paramètre' : isDelete ? 'Suppression d’un paramètre' : 'Consultation des paramètres';
                    return { actionName: verb, pageName: 'Page Outils & Paramètres', module: 'Outils', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };
                  }
                  if (combined.includes('ARCHIVE')) {
                    const verb = isPost ? 'Versement d’une archive' : isPut ? 'Mise à jour d’un versement' : isDelete ? 'Destruction / Sort final' : 'Consultation du registre des archives';
                    return { actionName: verb, pageName: 'Page Archives', module: 'Archives', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' };
                  }
                  if (combined.includes('LOAN') || combined.includes('CONSULTATION')) {
                    const verb = isPost ? 'Enregistrement d’un prêt' : isPut ? 'Retour / Prolongation de prêt' : isDelete ? 'Annulation de prêt' : 'Consultation des prêts';
                    return { actionName: verb, pageName: 'Page Prêts & Consultations', module: 'Prêts', color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' };
                  }
                  if (combined.includes('CORRESPONDENCE') || combined.includes('MAIL') || combined.includes('COURRIER')) {
                    const verb = isPost ? 'Enregistrement d’un courrier' : isPut ? 'Mise à jour du courrier' : isDelete ? 'Suppression de courrier' : 'Consultation des courriers';
                    return { actionName: verb, pageName: 'Page Courriers', module: 'Courriers', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300' };
                  }
                  if (combined.includes('WORKFLOW')) {
                    return { actionName: 'Avancement circuit de validation', pageName: 'Page Workflows', module: 'Workflows', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' };
                  }
                  return { actionName: 'Action sur l’application', pageName: 'Page Tableau de bord', module: 'Système', color: 'bg-muted text-muted-foreground' };
                };

                const info = formatActivity(act.action, act.target);

                return (
                  <div key={act.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {(act.user || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          <span className="font-semibold text-foreground">{act.user || 'Utilisateur'}</span>
                          <span className="mx-2 text-muted-foreground font-normal">•</span>
                          <span className="text-primary font-medium">{info.pageName}</span>
                          <span className="mx-2 text-muted-foreground font-normal">•</span>
                          <span className="text-muted-foreground">{info.actionName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-0.5">
                          {new Date(act.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn('text-xs font-medium', info.color)}>
                      {info.module}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}