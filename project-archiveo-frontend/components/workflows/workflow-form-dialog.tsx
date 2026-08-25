'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchDocuments, DocumentApi } from '@/services/documents-api';
import { createWorkflow, CreateWorkflowPayload } from '@/services/workflows-api';
import { Loader2, Plus, Trash2, Sparkles, Layers } from 'lucide-react';
import { toast } from 'sonner';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  targetScope: 'all' | 'documents' | 'archives' | 'correspondences';
  steps: Array<{ name: string; validatorRole: string }>;
}

export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-ged-standard',
    name: 'Circuit Standard GED & Documents',
    description: 'Validation séquentielle en 3 étapes pour tous les documents courants',
    targetScope: 'documents',
    steps: [
      { name: 'Contrôle de conformité & pièces', validatorRole: 'User' },
      { name: 'Visa du Responsable de Service', validatorRole: 'RecordsManager' },
      { name: 'Approbation Finale & Publication', validatorRole: 'Admin' },
    ],
  },
  {
    id: 'tpl-finance',
    name: 'Circuit Factures & Engagements Comptables',
    description: 'Contrôle financier, bon à payer et visa Direction',
    targetScope: 'documents',
    steps: [
      { name: 'Rapprochement Facture / Bon de commande', validatorRole: 'User' },
      { name: 'Validation Direction Administrative & Financière', validatorRole: 'RecordsManager' },
      { name: 'Ordonnancement Direction Générale', validatorRole: 'Admin' },
    ],
  },
  {
    id: 'tpl-archives-retention',
    name: 'Circuit Élimination & Versement d’Archives',
    description: 'Procédure légale de versement historique ou destruction certifiée',
    targetScope: 'archives',
    steps: [
      { name: 'Contrôle du Tableau de Gestion & DUA', validatorRole: 'RecordsManager' },
      { name: 'Avis du Service Juridique / Émetteur', validatorRole: 'User' },
      { name: 'Bordereau d’élimination validé par la Direction', validatorRole: 'Admin' },
    ],
  },
  {
    id: 'tpl-courrier-confidentiel',
    name: 'Circuit Courrier Confidentiel & Direction',
    description: 'Traitement réservé aux correspondances sensibles',
    targetScope: 'correspondences',
    steps: [
      { name: 'Réception & Enregistrement Secrétariat', validatorRole: 'User' },
      { name: 'Imputation & Consignes Direction', validatorRole: 'Admin' },
    ],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialTemplate?: WorkflowTemplate | null;
}

export function WorkflowFormDialog({ open, onOpenChange, onSaved, initialTemplate }: Props) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentApi[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [steps, setSteps] = useState<Array<{ name: string; validatorRole: string }>>([
    { name: 'Vérification conformité', validatorRole: 'User' },
    { name: 'Validation hiérarchique', validatorRole: 'RecordsManager' },
    { name: 'Approbation finale', validatorRole: 'Admin' },
  ]);

  const [templates, setTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('archiveo_workflow_templates');
      if (saved) {
        try {
          setTemplates(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchDocuments().then(setDocuments).catch(() => []);
      if (initialTemplate) {
        setSelectedTemplateId(initialTemplate.id);
        setName(initialTemplate.name);
        setSteps(initialTemplate.steps);
      } else {
        setSelectedTemplateId('tpl-ged-standard');
        const defaultTpl = DEFAULT_WORKFLOW_TEMPLATES[0];
        setName(defaultTpl.name);
        setSteps(defaultTpl.steps);
      }
      setDocumentId('');
    }
  }, [open, initialTemplate]);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (tplId === 'custom') return;
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      setName(found.name);
      setSteps(found.steps);
      toast.success(`Modèle « ${found.name} » appliqué`);
    }
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { name: `Étape ${prev.length + 1}`, validatorRole: 'User' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error('Un workflow doit comporter au moins une étape');
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, key: 'name' | 'validatorRole', value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    );
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('Nom du circuit');
    if (!documentId) missing.push('Document à rattacher');

    if (missing.length > 0) {
      toast.error(`Champs obligatoires : ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const payload: CreateWorkflowPayload = {
        name: name.trim(),
        documentId,
        steps: steps.map((s, i) => ({
          order: i + 1,
          name: s.name,
          validatorRole: s.validatorRole,
        })),
      };

      await createWorkflow(payload);
      toast.success('Circuit de validation lancé avec succès');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors du lancement du circuit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Lancer un circuit de validation
          </DialogTitle>
          <DialogDescription>
            Appliquez un modèle de circuit type en 1 clic ou personnalisez les étapes de validation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Choix du modèle type */}
          <div className="rounded-xl border bg-primary/5 p-3 space-y-2">
            <Label className="font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Modèle de Circuit Prédéfini
            </Label>
            <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choisir un modèle standard..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.steps.length} étapes)
                  </SelectItem>
                ))}
                <SelectItem value="custom">✏️ Circuit Sur-Mesure Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nom du circuit *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Validation Contrat Cadre"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Document à valider *</Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le document..." />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      [{d.reference}] {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">Étapes séquentielles ({steps.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1 text-[11px] h-7">
                <Plus className="h-3 w-3" /> Ajouter une étape
              </Button>
            </div>

            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border p-2.5 bg-card">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <Input
                    className="flex-1 text-xs"
                    value={step.name}
                    onChange={(e) => updateStep(i, 'name', e.target.value)}
                    placeholder="Nom de l'étape"
                  />
                  <Select
                    value={step.validatorRole}
                    onValueChange={(v) => updateStep(i, 'validatorRole', v)}
                  >
                    <SelectTrigger className="w-[180px] text-xs">
                      <SelectValue placeholder="Rôle validateur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Administrateur</SelectItem>
                      <SelectItem value="RecordsManager">Records Manager</SelectItem>
                      <SelectItem value="User">Utilisateur Métier</SelectItem>
                      <SelectItem value="Direction">Direction</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(i)}
                    className="text-destructive h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Lancer le circuit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
