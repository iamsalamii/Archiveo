'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExportMenu } from '@/components/shared/export-menu';
import {
  fetchWorkflows,
  deleteWorkflow,
  WorkflowApi,
  WorkflowStepApi,
} from '@/services/workflows-api';
import { WorkflowFormDialog } from '@/components/workflows/workflow-form-dialog';
import { WorkflowProcessDialog } from '@/components/workflows/workflow-process-dialog';
import {
  Workflow as WorkflowIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Process dialog state
  const [processOpen, setProcessOpen] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowApi | null>(null);
  const [activeStep, setActiveStep] = useState<WorkflowStepApi | null>(null);
  const [processAction, setProcessAction] = useState<'approved' | 'rejected'>('approved');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch {
      if (!silent) toast.error('Impossible de charger les workflows');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportData = useMemo(() => {
    return workflows.map((wf) => ({
      Workflow: wf.name,
      Document: wf.documentTitle || wf.documentId,
      Statut:
        wf.status === 'completed'
          ? 'Terminé'
          : wf.status === 'rejected'
          ? 'Rejeté'
          : `En cours (Étape ${wf.currentStep}/${wf.steps?.length || 0})`,
      'Nombre d’étapes': wf.steps?.length || 0,
      'Date de création': wf.createdAt ? new Date(wf.createdAt).toLocaleDateString('fr-FR') : '—',
    }));
  }, [workflows]);

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous supprimer ce workflow ?')) return;
    const previous = [...workflows];
    // Optimistic UI
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    toast.success('Workflow supprimé');
    try {
      await deleteWorkflow(id);
      load(true);
    } catch {
      setWorkflows(previous);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleOpenProcess = (
    wf: WorkflowApi,
    step: WorkflowStepApi,
    action: 'approved' | 'rejected'
  ) => {
    setActiveWorkflow(wf);
    setActiveStep(step);
    setProcessAction(action);
    setProcessOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        subtitle="Circuits de validation et processus documentaires multi-acteurs"
        icon={<WorkflowIcon className="h-6 w-6" />}
        exportData={exportData}
        exportFilename="registre-circuits-workflows"
        exportTitle="Registre des Circuits de Validation (Workflows)"
        exportColumns={[
          { key: 'Workflow', label: 'Circuit / Intitulé' },
          { key: 'Document', label: 'Document rattaché' },
          { key: 'Statut', label: 'Statut global' },
          { key: 'Nombre d’étapes', label: 'Nombre étapes' },
          { key: 'Date de création', label: 'Date création' },
        ]}
        exportMetadata={{
          subtitle: 'Suivi officiel de validation et des visas documentaires',
          filterSummary: `${workflows.length} circuit(s) actif(s)`,
        }}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau workflow
          </Button>
        }
      />

      {loading ? (
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      ) : workflows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <WorkflowIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Aucun circuit de validation actif</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Créez un circuit de validation pour soumettre un document à plusieurs étapes d'approbation.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Créer un workflow
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((wf) => (
            <Card key={wf.id} className="transition-all hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{wf.name}</CardTitle>
                      <Badge
                        variant={
                          wf.status === 'completed'
                            ? 'default'
                            : wf.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {wf.status === 'completed'
                          ? 'Terminé'
                          : wf.status === 'rejected'
                          ? 'Rejeté'
                          : `En cours (Étape ${wf.currentStep}/${wf.steps.length})`}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Document : {wf.documentTitle || wf.documentId}</span>
                      <span>•</span>
                      <span>Créé le {new Date(wf.createdAt).toLocaleDateString('fr-FR')}</span>
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <ExportMenu
                      data={[
                        {
                          Workflow: wf.name,
                          Document: wf.documentTitle || wf.documentId,
                          Statut: wf.status,
                          Étape: `${wf.currentStep}/${wf.steps.length}`,
                          Créé_le: new Date(wf.createdAt).toLocaleDateString('fr-FR'),
                          ...Object.fromEntries(
                            wf.steps.map((s, idx) => [
                              `Étape_${idx + 1}_${s.name}`,
                              `${s.status} (${s.validatedByUserName || 'En attente'})`,
                            ])
                          ),
                        },
                      ]}
                      filename={`workflow-${wf.name.toLowerCase().replace(/\s+/g, '-')}`}
                      title={`Circuit de validation — ${wf.name}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(wf.id)}
                      className="text-destructive h-8 w-8 hover:bg-destructive/10"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                {/* Steps timeline */}
                <div className="flex items-center gap-2 overflow-x-auto py-2">
                  {wf.steps.map((step, i) => {
                    const isApproved = step.status === 'approved';
                    const isRejected = step.status === 'rejected';
                    const isCurrent = wf.status === 'in_progress' && wf.currentStep === step.order;

                    const Icon = isApproved ? CheckCircle2 : isRejected ? XCircle : Clock;
                    const color = isApproved
                      ? 'text-emerald-500'
                      : isRejected
                      ? 'text-red-500'
                      : isCurrent
                      ? 'text-primary'
                      : 'text-muted-foreground';

                    return (
                      <div key={step.id} className="flex items-center gap-2">
                        <div
                          className={`flex flex-col items-center gap-2 min-w-[170px] rounded-lg border p-3 ${
                            isCurrent
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : isApproved
                              ? 'border-emerald-500/30 bg-emerald-50/20'
                              : isRejected
                              ? 'border-red-500/30 bg-red-50/20'
                              : 'bg-muted/30'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                              isApproved
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                                : isRejected
                                ? 'border-red-500 bg-red-50 dark:bg-red-950'
                                : isCurrent
                                ? 'border-primary bg-primary/10'
                                : 'border-muted bg-muted/50'
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${color}`} />
                          </div>

                          <div className="text-center w-full">
                            <p className="text-xs font-semibold">{step.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Rôle : {step.validatorRole}
                            </p>
                            {step.actionDate ? (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(step.actionDate).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">En attente</span>
                            )}
                            {step.validatedByUserName && (
                              <p className="text-[10px] font-medium text-foreground">
                                par {step.validatedByUserName}
                              </p>
                            )}
                            {step.comment && (
                              <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 mt-1 truncate">
                                "{step.comment}"
                              </p>
                            )}
                          </div>

                          {isCurrent && (
                            <div className="flex items-center gap-1.5 mt-1 w-full pt-1 border-t">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleOpenProcess(wf, step, 'approved')}
                              >
                                <Check className="h-3 w-3" /> Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs flex-1 gap-1"
                                onClick={() => handleOpenProcess(wf, step, 'rejected')}
                              >
                                <X className="h-3 w-3" /> Rejeter
                              </Button>
                            </div>
                          )}
                        </div>

                        {i < wf.steps.length - 1 && (
                          <div
                            className={`h-0.5 w-6 shrink-0 ${
                              isApproved ? 'bg-emerald-500' : 'bg-muted'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WorkflowFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => load(true)}
      />

      <WorkflowProcessDialog
        open={processOpen}
        onOpenChange={setProcessOpen}
        workflow={activeWorkflow}
        step={activeStep}
        action={processAction}
        onProcessed={() => load(true)}
      />
    </div>
  );
}
