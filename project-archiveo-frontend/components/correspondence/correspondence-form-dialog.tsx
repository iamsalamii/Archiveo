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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParameterSelect } from '@/components/shared/parameter-select';
import {
  createCorrespondence,
  updateCorrespondence,
  CorrespondenceApi,
  CreateCorrespondencePayload,
} from '@/services/correspondence-api';
import { fetchDocuments, DocumentApi } from '@/services/documents-api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondence?: CorrespondenceApi | null;
  onSaved: () => void;
}

export function CorrespondenceFormDialog({
  open,
  onOpenChange,
  correspondence,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentApi[]>([]);
  const [form, setForm] = useState<CreateCorrespondencePayload>({
    type: 'incoming',
    subject: '',
    senderId: '',
    recipientId: '',
    date: new Date().toISOString().slice(0, 10),
    signatureTypeId: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchDocuments().then(setDocuments).catch(() => []);
      if (correspondence) {
        setForm({
          type: correspondence.type,
          subject: correspondence.subject,
          senderId: correspondence.senderId,
          recipientId: correspondence.recipientId,
          date: correspondence.date ? correspondence.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          documentId: correspondence.documentId,
          signatureTypeId: correspondence.signatureTypeId,
          notes: correspondence.notes || '',
        });
      } else {
        setForm({
          type: 'incoming',
          subject: '',
          senderId: '',
          recipientId: '',
          date: new Date().toISOString().slice(0, 10),
          signatureTypeId: '',
          notes: '',
        });
      }
    }
  }, [correspondence, open]);

  const set = (key: keyof CreateCorrespondencePayload, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.subject || !form.senderId || !form.recipientId) {
      toast.error('Veuillez renseigner l’objet, l’expéditeur et le destinataire');
      return;
    }
    setLoading(true);
    try {
      if (correspondence) {
        await updateCorrespondence(correspondence.id, form);
        toast.success('Courrier mis à jour');
      } else {
        await createCorrespondence(form);
        toast.success('Courrier enregistré avec succès');
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors de l’enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {correspondence ? 'Modifier le courrier' : 'Nouveau courrier'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type de courrier *</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incoming">Entrant</SelectItem>
                <SelectItem value="outgoing">Sortant</SelectItem>
                <SelectItem value="internal">Interne</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.date ? form.date.slice(0, 10) : ''}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Objet *</Label>
            <Input
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Objet du courrier"
            />
          </div>

          <div className="space-y-2">
            <Label>Expéditeur *</Label>
            <ParameterSelect
              groupCode="SENDER"
              value={form.senderId}
              onValueChange={(v) => set('senderId', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Destinataire *</Label>
            <ParameterSelect
              groupCode="RECIPIENT"
              value={form.recipientId}
              onValueChange={(v) => set('recipientId', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type de signature</Label>
            <ParameterSelect
              groupCode="SIGNATURE_TYPE"
              value={form.signatureTypeId}
              onValueChange={(v) => set('signatureTypeId', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Document lié (optionnel)</Label>
            <Select
              value={form.documentId || 'none'}
              onValueChange={(v) => set('documentId', v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Associer un document..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun document</SelectItem>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.reference} — {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Notes & Commentaires</Label>
            <Textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Notes complémentaires..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {correspondence ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
