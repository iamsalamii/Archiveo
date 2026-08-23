'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function WorkflowFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentApi[]>([]);
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [steps, setSteps] = useState<Array<{ name: string; validatorRole: string }>>([
    { name: 'Vérification conformité', validatorRole: 'User' },
    { name: 'Validation hiérarchique', validatorRole: 'RecordsManager' },
    { name: 'Approbation finale', validatorRole: 'Admin' },
  ]);

  useEffect(() => {
    if (open) {
      fetchDocuments().then(setDocuments).catch(() => []);
      setName('Circuit de validation document');
      setDocumentId('');
    }
  }, [open]);

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
    if (!name.trim()) missing.push('Nom du workflow');
    if (!documentId) missing.push('Document');

    if (missing.length > 0) {
      toast.error(`Champs obligatoires manquants : ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const payload: CreateWorkflowPayload = {
        name,
        documentId,
        steps: steps.map((s, i) => ({
          order: i + 1,
          name: s.name,
          validatorRole: s.validatorRole,
        })),
      };

      await createWorkflow(payload);
      toast.success('Workflow créé avec succès');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors de la création du workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau circuit de validation (Workflow)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du workflow *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Validation Contrat Cadre"
            />
          </div>

          <div className="space-y-2">
            <Label>Document à valider *</Label>
            <Select value={documentId} onValueChange={setDocumentId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le document..." />
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.reference} — {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Étapes de validation ({steps.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Ajouter une étape
              </Button>
            </div>

            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
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
                    className="text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Lancer le circuit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
