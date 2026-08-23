'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PenTool,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Smartphone,
  Mail,
  ShieldCheck,
  MoreVertical,
  Download,
  Share2,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  Eye,
  Loader2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DocumentSignatureApi,
  fetchPendingSignatures,
  fetchRequestedSignatures,
  fetchAllSignatures,
  rejectSignature,
} from '@/services/signatures-api';
import { SignaturePadDialog } from '@/components/signatures/signature-pad-dialog';
import { SignatureRequestDialog } from '@/components/signatures/signature-request-dialog';
import { SignatureCertificateDialog } from '@/components/signatures/signature-certificate-dialog';

export default function SignaturesPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'requested' | 'signed' | 'rejected'>('pending');
  const [signatures, setSignatures] = useState<DocumentSignatureApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog states
  const [signDialogDoc, setSignDialogDoc] = useState<DocumentSignatureApi | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const [certDialogDoc, setCertDialogDoc] = useState<DocumentSignatureApi | null>(null);
  const [certDialogOpen, setCertDialogOpen] = useState(false);

  const [rejectDialogDoc, setRejectDialogDoc] = useState<DocumentSignatureApi | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchAllSignatures();
      setSignatures(all);
    } catch (err) {
      console.warn('Erreur chargement parapheur:', err);
      // Mock initial demo items if empty
      setSignatures([
        {
          id: 'sig-demo-1',
          documentId: 'doc-1',
          documentTitle: 'Contrat Cadre Fournisseur Archivage 2026',
          documentReference: 'CTR-2026-004',
          requestedByUserName: 'Direction Générale',
          signerName: 'Administrateur Archivéo',
          signerEmail: 'admin@archiveo.com',
          signerPhone: '+225 0708091011',
          signerRole: 'Directeur des Opérations',
          status: 'pending',
          notificationChannel: 'both',
          requestedAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          whatsAppDirectLink: 'https://wa.me/2250708091011?text=Document%20à%20signer',
        },
        {
          id: 'sig-demo-2',
          documentId: 'doc-2',
          documentTitle: 'Procès-Verbal de Récolement Trimestriel',
          documentReference: 'PV-2026-Q1',
          requestedByUserName: 'Service Archives',
          signerName: 'Sophie Martin',
          signerEmail: 'sophie.martin@archiveo.com',
          signerPhone: '+33 6 12 34 56 78',
          signerRole: 'Responsable Juridique',
          status: 'signed',
          signatureType: 'drawing',
          signedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          sha256Hash: 'a7c93e481b95f46294d1b7123985fec184d0b1784918e7e174b486950293b6e8',
          certificateNumber: 'CERT-20260823-A7C93E48',
          notificationChannel: 'whatsapp',
          requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          signerIpAddress: '192.168.1.45',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered lists
  const filteredList = useMemo(() => {
    return signatures.filter((item) => {
      // Tab matching
      if (activeTab === 'pending' && item.status !== 'pending') return false;
      if (activeTab === 'requested' && item.status !== 'pending') return false;
      if (activeTab === 'signed' && item.status !== 'signed') return false;
      if (activeTab === 'rejected' && item.status !== 'rejected') return false;

      // Search matching
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.documentTitle.toLowerCase().includes(q) ||
        item.documentReference.toLowerCase().includes(q) ||
        item.signerName.toLowerCase().includes(q) ||
        item.signerEmail.toLowerCase().includes(q) ||
        (item.certificateNumber && item.certificateNumber.toLowerCase().includes(q))
      );
    });
  }, [signatures, activeTab, search]);

  // Statistics
  const stats = useMemo(() => {
    const pending = signatures.filter((s) => s.status === 'pending').length;
    const signed = signatures.filter((s) => s.status === 'signed').length;
    const rejected = signatures.filter((s) => s.status === 'rejected').length;
    return { pending, signed, rejected, total: signatures.length };
  }, [signatures]);

  // Optimistic handler for signing
  const handleSignedSuccess = (updated: DocumentSignatureApi) => {
    setSignatures((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Optimistic handler for new request
  const handleCreatedSuccess = (created: DocumentSignatureApi) => {
    setSignatures((prev) => [created, ...prev]);
  };

  // Reject confirmation
  const confirmReject = async () => {
    if (!rejectDialogDoc) return;
    if (!rejectReason.trim()) {
      toast.error('Veuillez préciser le motif du refus.');
      return;
    }

    setIsRejecting(true);
    const previous = [...signatures];
    // Optimistic UI
    setSignatures((prev) =>
      prev.map((s) =>
        s.id === rejectDialogDoc.id
          ? { ...s, status: 'rejected', rejectReason, signedAt: new Date().toISOString() }
          : s
      )
    );

    try {
      await rejectSignature(rejectDialogDoc.id, rejectReason);
      toast.success('Signature refusée et émetteur notifié.');
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (err: unknown) {
      setSignatures(previous);
      toast.error((err as Error).message || 'Erreur lors du refus.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Export Data formatted for PageHeader
  const exportData = useMemo(() => {
    return filteredList.map((s) => ({
      Référence: s.documentReference,
      Document: s.documentTitle,
      Demandeur: s.requestedByUserName || '—',
      Signataire: s.signerName,
      Email: s.signerEmail,
      Téléphone_WhatsApp: s.signerPhone || '—',
      Statut: s.status === 'signed' ? 'Signé' : s.status === 'rejected' ? 'Refusé' : 'En attente',
      Canal: s.notificationChannel === 'both' ? 'Email + WhatsApp' : s.notificationChannel === 'whatsapp' ? 'WhatsApp' : 'Email',
      Date_Demande: s.requestedAt ? new Date(s.requestedAt).toLocaleDateString('fr-FR') : '—',
      Date_Signature: s.signedAt ? new Date(s.signedAt).toLocaleDateString('fr-FR') : '—',
      Certificat_SHA256: s.certificateNumber || s.sha256Hash || '—',
    }));
  }, [filteredList]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parapheur Électronique & Signatures"
        subtitle="Validation juridique, signatures multi-signataires et scellement cryptographique avec alertes WhatsApp & Email"
        icon={<PenTool className="h-6 w-6" />}
        exportData={exportData}
        exportFilename="registre-parapheur-signatures"
        exportTitle="Registre Officiel du Parapheur Électronique"
        exportColumns={[
          { key: 'Référence', label: 'Réf. Document' },
          { key: 'Document', label: 'Titre Document' },
          { key: 'Signataire', label: 'Signataire' },
          { key: 'Email', label: 'Email' },
          { key: 'Téléphone_WhatsApp', label: 'WhatsApp / Mobile' },
          { key: 'Statut', label: 'Statut' },
          { key: 'Date_Demande', label: 'Date Demande' },
          { key: 'Date_Signature', label: 'Date Signature' },
          { key: 'Certificat_SHA256', label: 'N° Certificat / Empreinte' },
        ]}
        exportMetadata={{
          subtitle: 'Journal de traçabilité des visas et signatures électroniques eIDAS',
          filterSummary: `${filteredList.length} acte(s) affiché(s) (${stats.signed} validé(s), ${stats.pending} en attente)`,
        }}
        actions={
          <Button onClick={() => setRequestDialogOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Transmettre pour Signature
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-amber-200/70 dark:border-amber-900/50 bg-gradient-to-br from-amber-500/5 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">À signer (En attente)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.pending}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-500/5 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Scellés & Signés</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.signed}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200/70 dark:border-rose-900/50 bg-gradient-to-br from-rose-500/5 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Refusés / Rejetés</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{stats.rejected}</h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/70 dark:border-blue-900/50 bg-gradient-to-br from-blue-500/5 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Parapheurs</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{stats.total}</h3>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content & Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Documents du Parapheur</CardTitle>
              <CardDescription>
                Consultez, signez ou suivez les visas et signatures en cours
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher document, signataire..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'pending' | 'requested' | 'signed' | 'rejected')}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
              <TabsTrigger value="pending" className="gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" /> À signer ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="requested" className="gap-1.5 text-xs">
                <Share2 className="h-3.5 w-3.5" /> En cours ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="signed" className="gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /> Signés ({stats.signed})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1.5 text-xs">
                <XCircle className="h-3.5 w-3.5" /> Rejetés ({stats.rejected})
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Document & Référence</TableHead>
                    <TableHead>Signataire / Rôle</TableHead>
                    <TableHead>Canaux de Notif.</TableHead>
                    <TableHead>Date / Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-xs">Chargement du parapheur électronique...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                        Aucun document dans cet état.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((sig) => (
                      <TableRow key={sig.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">
                            {sig.documentTitle}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                            <span>[{sig.documentReference}]</span>
                            {sig.requestedByUserName && (
                              <span>• Émis par {sig.requestedByUserName}</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <User className="h-3.5 w-3.5 text-primary" />
                            {sig.signerName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sig.signerEmail}
                            {sig.signerRole && ` • ${sig.signerRole}`}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {(sig.notificationChannel === 'whatsapp' || sig.notificationChannel === 'both') && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1 text-[11px]">
                                <Smartphone className="h-3 w-3" /> WhatsApp
                              </Badge>
                            )}
                            {(sig.notificationChannel === 'email' || sig.notificationChannel === 'both') && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 gap-1 text-[11px]">
                                <Mail className="h-3 w-3" /> Email
                              </Badge>
                            )}
                          </div>
                          {sig.signerPhone && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                              {sig.signerPhone}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          {sig.signedAt ? (
                            <div>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400 block">
                                Signé le {new Date(sig.signedAt).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                à {new Date(sig.signedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-muted-foreground block">
                                Reçu le {new Date(sig.requestedAt).toLocaleDateString('fr-FR')}
                              </span>
                              {sig.dueDate && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                                  Échéance : {new Date(sig.dueDate).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          {sig.status === 'signed' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3" /> Signé & Scellé
                            </Badge>
                          ) : sig.status === 'rejected' ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> Refusé
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 gap-1 hover:bg-amber-100">
                              <Clock className="h-3 w-3" /> En attente
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {sig.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                  onClick={() => {
                                    setSignDialogDoc(sig);
                                    setSignDialogOpen(true);
                                  }}
                                >
                                  <PenTool className="h-3.5 w-3.5" /> Signer
                                </Button>

                                {sig.whatsAppDirectLink && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    title="Relancer via WhatsApp"
                                    onClick={() => window.open(sig.whatsAppDirectLink, '_blank')}
                                  >
                                    <Smartphone className="h-3.5 w-3.5" />
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive gap-2 text-xs"
                                      onClick={() => {
                                        setRejectDialogDoc(sig);
                                        setRejectDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-3.5 w-3.5" /> Refuser de signer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}

                            {sig.status === 'signed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs text-blue-700 bg-blue-50/50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                onClick={() => {
                                  setCertDialogDoc(sig);
                                  setCertDialogOpen(true);
                                }}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Certificat
                              </Button>
                            )}

                            {sig.status === 'rejected' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-muted-foreground gap-1"
                                onClick={() => {
                                  toast.info(`Motif du refus : ${sig.rejectReason || 'Non spécifié'}`);
                                }}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Voir motif
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogues modulaires */}
      <SignaturePadDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        signature={signDialogDoc}
        onSigned={handleSignedSuccess}
      />

      <SignatureRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        onCreated={handleCreatedSuccess}
      />

      <SignatureCertificateDialog
        open={certDialogOpen}
        onOpenChange={setCertDialogOpen}
        signature={certDialogDoc}
      />

      {/* Dialogue de refus de signature */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Refus de Signature
            </DialogTitle>
            <DialogDescription>
              Veuillez indiquer le motif du refus pour « {rejectDialogDoc?.documentTitle} ». L'émetteur sera directement notifié.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reason" className="text-xs">Motif du refus *</Label>
            <Textarea
              id="reason"
              placeholder="Ex : Document incomplet, clauses non conformes..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmReject}
              disabled={isRejecting}
              className="gap-2"
            >
              {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
