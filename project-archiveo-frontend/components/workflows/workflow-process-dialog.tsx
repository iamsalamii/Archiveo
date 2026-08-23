'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  processWorkflowStep,
  WorkflowApi,
  WorkflowStepApi,
} from '@/services/workflows-api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: WorkflowApi | null;
  step?: WorkflowStepApi | null;
  action: 'approved' | 'rejected';
  onProcessed: () => void;
}

export function WorkflowProcessDialog({
  open,
  onOpenChange,
  workflow,
  step,
  action,
  onProcessed,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');

  const isApprove = action === 'approved';

  const handleProcess = async () => {
    if (!workflow || !step) return;

    setLoading(true);
    try {
      await processWorkflowStep(workflow.id, step.id, {
        action,
        comment: comment || (isApprove ? 'Étape validée' : 'Étape rejetée'),
      });
      toast.success(isApprove ? 'Étape validée avec succès' : 'Étape rejetée');
      onProcessed();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors du traitement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Approuver l'étape
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Rejeter l'étape
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Circuit : <span className="font-semibold text-foreground">{workflow?.name}</span>
            <br />
            Étape : <span className="font-semibold text-foreground">{step?.name}</span> (Rôle : {step?.validatorRole})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Commentaire ou motif</Label>
            <Textarea
              rows={3}
              placeholder={isApprove ? 'Remarques éventuelles sur la validation...' : 'Motif obligatoire ou explicatif du rejet...'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleProcess}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isApprove ? 'Confirmer la validation' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
