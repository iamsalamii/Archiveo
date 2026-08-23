'use client';

import React, { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Send,
  Smartphone,
  Mail,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  ExternalLink,
  Copy,
  Loader2,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CreateSignaturePayload,
  DocumentSignatureApi,
  requestSignature,
} from '@/services/signatures-api';
import { fetchDocuments, DocumentApi } from '@/services/documents-api';
import { fetchUsers, UserApi } from '@/services/users-api';

interface SignatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (signature: DocumentSignatureApi) => void;
  initialDocument?: DocumentApi | null;
}

export function SignatureRequestDialog({
  open,
  onOpenChange,
  onCreated,
  initialDocument,
}: SignatureRequestDialogProps) {
  const [documents, setDocuments] = useState<DocumentApi[]>([]);
  const [users, setUsers] = useState<UserApi[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [signerMode, setSignerMode] = useState<'existing' | 'manual'>('existing');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [channel, setChannel] = useState<'both' | 'whatsapp' | 'email'>('both');
  const [note, setNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<DocumentSignatureApi | null>(null);

  useEffect(() => {
    if (open) {
      setCreatedResult(null);
      if (initialDocument) {
        setSelectedDocId(initialDocument.id);
      }
      loadDependencies();
    }
  }, [open, initialDocument]);

  const loadDependencies = async () => {
    setLoadingInitial(true);
    try {
      const [docs, usrList] = await Promise.all([
        fetchDocuments(),
        fetchUsers(),
      ]);
      setDocuments(docs);
      setUsers(usrList);
      if (!selectedDocId && docs.length > 0) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const u = users.find((x) => x.id === userId);
    if (u) {
      setSignerName(`${u.firstName} ${u.lastName}`);
      setSignerEmail(u.email);
      setSignerPhone(u.phone || '');
      setSignerRole(u.function || 'Collaborateur');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedDoc = documents.find((d) => d.id === selectedDocId);
    if (!selectedDoc) {
      toast.error('Veuillez sélectionner un document valide.');
      return;
    }

    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error('Le nom et l’adresse email du signataire sont obligatoires.');
      return;
    }

    if ((channel === 'whatsapp' || channel === 'both') && !signerPhone.trim()) {
      toast.error('Veuillez renseigner le numéro WhatsApp pour activer l’alerte WhatsApp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateSignaturePayload = {
        documentId: selectedDoc.id,
        documentTitle: selectedDoc.title,
        documentReference: selectedDoc.reference,
        signerUserId: signerMode === 'existing' ? selectedUserId || undefined : undefined,
        signerName,
        signerEmail,
        signerPhone: signerPhone || undefined,
        signerRole: signerRole || undefined,
        dueDate: dueDate || undefined,
        notificationChannel: channel,
        note: note || undefined,
      };

      const result = await requestSignature(payload);
      toast.success(`Demande de signature envoyée avec succès à ${signerName} !`);
      setCreatedResult(result);
      onCreated(result);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur lors de la création de la demande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyWhatsAppLink = () => {
    if (!createdResult?.whatsAppDirectLink) return;
    navigator.clipboard.writeText(createdResult.whatsAppDirectLink);
    toast.success('Lien WhatsApp copié dans le presse-papier !');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">Transmettre un Document pour Signature</DialogTitle>
              <DialogDescription>
                Créez un circuit de signature électronique avec notification par Email et WhatsApp.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {createdResult ? (
          /* Écran de confirmation après envoi avec action WhatsApp */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300">
                Demande de signature transmise !
              </h3>
              <p className="text-xs text-muted-foreground">
                Le document « <strong>{createdResult.documentTitle}</strong> » a été mis à disposition de{' '}
                <strong>{createdResult.signerName}</strong>.
              </p>
            </div>

            {createdResult.whatsAppDirectLink && (
              <div className="p-4 bg-muted/40 border rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Smartphone className="h-4 w-4" /> Notification WhatsApp Directe
                </div>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez envoyer directement l'invitation à signer sur le WhatsApp du signataire ({createdResult.signerPhone}) :
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={copyWhatsAppLink}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copier le lien
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => window.open(createdResult.whatsAppDirectLink!, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ouvrir dans WhatsApp
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Formulaire de demande */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sélection du Document */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-primary" /> Document à signer *
              </Label>
              <Select value={selectedDocId} onValueChange={setSelectedDocId} disabled={loadingInitial || !!initialDocument}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un document..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">[{d.reference}]</span>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode de sélection du signataire */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" /> Destinataire / Signataire *
                </Label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSignerMode('existing')}
                    className={`px-2 py-1 rounded transition-colors ${
                      signerMode === 'existing'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Utilisateur interne
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignerMode('manual');
                      setSelectedUserId('');
                    }}
                    className={`px-2 py-1 rounded transition-colors ${
                      signerMode === 'manual'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Tiers externe
                  </button>
                </div>
              </div>

              {signerMode === 'existing' && (
                <div className="space-y-1">
                  <Select value={selectedUserId} onValueChange={handleSelectUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un collaborateur..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="sname" className="text-xs">Nom complet *</Label>
                  <Input
                    id="sname"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Ex : Jean Dupont"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="semail" className="text-xs">Email *</Label>
                  <Input
                    id="semail"
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="jean.dupont@entreprise.fr"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sphone" className="text-xs flex items-center gap-1">
                    <Smartphone className="h-3 w-3 text-emerald-600" /> Numéro WhatsApp (Indicatif inclus)
                  </Label>
                  <Input
                    id="sphone"
                    value={signerPhone}
                    onChange={(e) => setSignerPhone(e.target.value)}
                    placeholder="+225 0708091011 ou +33 6..."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="srole" className="text-xs">Rôle / Fonction</Label>
                  <Input
                    id="srole"
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    placeholder="Directeur Financier, Juriste..."
                  />
                </div>
              </div>
            </div>

            {/* Canal de notification */}
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-semibold">Canal de notification du signataire</Label>
              <RadioGroup
                value={channel}
                onValueChange={(v) => setChannel(v as 'both' | 'whatsapp' | 'email')}
                className="grid grid-cols-3 gap-2"
              >
                <div className={`flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer text-xs ${channel === 'both' ? 'border-primary bg-primary/5' : ''}`}>
                  <RadioGroupItem value="both" id="ch-both" />
                  <Label htmlFor="ch-both" className="cursor-pointer">
                    WhatsApp + Email
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer text-xs ${channel === 'whatsapp' ? 'border-primary bg-primary/5' : ''}`}>
                  <RadioGroupItem value="whatsapp" id="ch-wa" />
                  <Label htmlFor="ch-wa" className="cursor-pointer text-emerald-600 font-medium">
                    WhatsApp seul
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer text-xs ${channel === 'email' ? 'border-primary bg-primary/5' : ''}`}>
                  <RadioGroupItem value="email" id="ch-em" />
                  <Label htmlFor="ch-em" className="cursor-pointer">
                    Email seul
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Échéance & Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sdate" className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date limite souhaitée
                </Label>
                <Input
                  id="sdate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="snote" className="text-xs">Consigne / Note au signataire</Label>
                <Input
                  id="snote"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex : Document urgent pour le CODIR..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Transmission...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Envoyer la demande
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
