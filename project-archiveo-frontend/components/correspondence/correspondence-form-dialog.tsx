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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParameterSelect } from '@/components/shared/parameter-select';
import { useParameters } from '@/contexts/parameters-context';
import {
  createCorrespondence,
  updateCorrespondence,
  CorrespondenceApi,
  CreateCorrespondencePayload,
} from '@/services/correspondence-api';
import { fetchDocuments, DocumentApi } from '@/services/documents-api';
import { Loader2, Mail, Send, Inbox, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
  const { getItems } = useParameters();
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

  const correspondenceTypes = getItems('CORRESPONDENCE_TYPE');

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
          signatureTypeId: correspondence.signatureTypeId || '',
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
    if (!form.subject?.trim()) {
      toast.error('Veuillez renseigner l’objet du courrier');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateCorrespondencePayload = {
        type: form.type || 'incoming',
        subject: form.subject.trim(),
        senderId: form.senderId?.trim() || 'Direction / Expéditeur Standard',
        recipientId: form.recipientId?.trim() || 'Service Destinataire',
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        documentId: form.documentId && form.documentId !== 'none' && form.documentId.trim() !== '' ? form.documentId : undefined,
        signatureTypeId: form.signatureTypeId || '',
        notes: form.notes || '',
      };

      if (correspondence) {
        await updateCorrespondence(correspondence.id, payload);
        toast.success('Courrier mis à jour avec succès');
      } else {
        await createCorrespondence(payload);
        toast.success('Nouveau courrier enregistré');
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors de l’enregistrement du courrier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span>{correspondence ? 'Modifier le courrier' : 'Enregistrer un nouveau courrier'}</span>
          </DialogTitle>
          <DialogDescription>
            Renseignez les informations du courrier entrant, sortant ou interne.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="space-y-1.5">
            <Label>Type de flux / Courrier *</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type..." />
              </SelectTrigger>
              <SelectContent>
                {correspondenceTypes.length > 0 ? (
                  correspondenceTypes.map((t) => (
                    <SelectItem key={t.id} value={t.code.toLowerCase()}>
                      {t.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="incoming">📥 Courrier Entrant</SelectItem>
                    <SelectItem value="outgoing">📤 Courrier Sortant</SelectItem>
                    <SelectItem value="internal">🔄 Courrier Interne</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Date d'émission / Réception *</Label>
            <Input
              type="date"
              value={form.date ? form.date.slice(0, 10) : ''}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Objet officiel du courrier *</Label>
            <Input
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Ex: Notification d'attribution de marché / Réf PV-2024"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Expéditeur / Émetteur</Label>
            <ParameterSelect
              groupCode="SENDER"
              value={form.senderId}
              onValueChange={(v) => set('senderId', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Destinataire / Service</Label>
            <ParameterSelect
              groupCode="RECIPIENT"
              value={form.recipientId}
              onValueChange={(v) => set('recipientId', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type de signature / Visa</Label>
            <ParameterSelect
              groupCode="SIGNATURE_TYPE"
              value={form.signatureTypeId}
              onValueChange={(v) => set('signatureTypeId', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Document GED associé (Optionnel)</Label>
            <Select
              value={form.documentId || 'none'}
              onValueChange={(v) => set('documentId', v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Associer une pièce jointe..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun document joint</SelectItem>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    [{d.reference}] {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observations & Consignes</Label>
            <Textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Notes complémentaires, délais de traitement, instructions de distribution..."
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {correspondence ? 'Mettre à jour' : 'Enregistrer le courrier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
