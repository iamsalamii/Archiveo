'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useParameters } from '@/contexts/parameters-context';
import { createDocument, updateDocument, DocumentApi, CreateDocumentPayload } from '@/services/documents-api';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: DocumentApi | null;
  onSaved: () => void;
}

export function DocumentFormDialog({ open, onOpenChange, document, onSaved }: Props) {
  const { getItems } = useParameters();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<CreateDocumentPayload>({
    title: '', description: '', typeId: '', categoryId: '', serviceId: '', retentionYears: 10,
  });

  useEffect(() => {
    if (document) {
      setForm({
        title: document.title,
        description: document.description || '',
        typeId: document.typeId,
        categoryId: document.categoryId,
        serviceId: document.serviceId,
        confidentialityId: document.confidentialityId,
        languageId: document.languageId,
        retentionYears: document.retentionYears,
        tags: document.tags,
        keywords: document.keywords,
      });
    } else {
      setForm({ title: '', description: '', typeId: '', categoryId: '', serviceId: '', retentionYears: 10 });
    }
    setFile(null);
  }, [document, open]);

  const set = (key: keyof CreateDocumentPayload, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!form.title?.trim()) missing.push('Titre');
    if (!form.typeId) missing.push('Type');
    if (!form.categoryId) missing.push('Catégorie');
    if (!form.serviceId) missing.push('Service');

    if (missing.length > 0) {
      toast.error(`Champs obligatoires manquants : ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      if (document) {
        await updateDocument(document.id, form);
        toast.success('Document mis à jour avec succès');
      } else {
        await createDocument(form, file || undefined);
        toast.success('Document créé avec succès');
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Une erreur est survenue lors de l’enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? 'Modifier le document' : 'Nouveau document'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Titre du document" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description..." />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={form.typeId} onValueChange={(v) => set('typeId', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {getItems('DOC_TYPE').map((i) => (
                  <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <Select value={form.categoryId} onValueChange={(v) => set('categoryId', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {getItems('CATEGORY').map((i) => (
                  <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Service *</Label>
            <Select value={form.serviceId} onValueChange={(v) => set('serviceId', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {getItems('SERVICE').map((i) => (
                  <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Confidentialité</Label>
            <Select value={form.confidentialityId || ''} onValueChange={(v) => set('confidentialityId', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {getItems('CONFIDENTIALITY').map((i) => (
                  <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Durée de conservation (années)</Label>
            <Input
              type="number"
              value={form.retentionYears}
              onChange={(e) => set('retentionYears', parseInt(e.target.value) || 10)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date d'expiration</Label>
            <Input
                type="date"
                value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
                onChange={(e) => {
                    const value = e.target.value;
                    set('expiresAt', value ? new Date(value + 'T00:00:00Z').toISOString() : undefined);
                }}
            />
          </div>

          {!document && (
            <div className="sm:col-span-2 space-y-2">
              <Label>Fichier (PDF, image, etc.)</Label>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              {file && <p className="text-xs text-muted-foreground">Fichier sélectionné : {file.name}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {document ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}