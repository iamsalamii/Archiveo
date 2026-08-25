'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, RefreshCw, Undo2, Trash2, BookOpen, Clock, Calendar, HandHelping, Plus, Eye } from 'lucide-react';
import { useParameters } from '@/contexts/parameters-context';
import {
    fetchLoans,
    fetchConsultations,
    returnLoan,
    renewLoan,
    deleteLoan,
    deleteConsultation,
    LoanApi,
    ConsultationApi,
} from '@/services/loans-api';
import { LoanFormDialog } from '@/components/loans/loan-form-dialog';
import { ConsultationFormDialog } from '@/components/loans/consultation-form-dialog';
import { toast } from 'sonner';

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function loanStatusVariant(status: string) {
    switch (status) {
        case 'active': return 'default' as const;
        case 'overdue': return 'destructive' as const;
        case 'returned': return 'secondary' as const;
        case 'renewed': return 'outline' as const;
        default: return 'outline' as const;
    }
}

function loanStatusLabel(status: string) {
    switch (status) {
        case 'active': return 'Actif';
        case 'overdue': return 'En retard';
        case 'returned': return 'Retourné';
        case 'renewed': return 'Prolongé';
        default: return status;
    }
}

export default function LoansPage() {
    const { getItemName } = useParameters();
    const [loans, setLoans] = useState<LoanApi[]>([]);
    const [consultations, setConsultations] = useState<ConsultationApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'loans' | 'consultations'>('loans');
    const [loanFormOpen, setLoanFormOpen] = useState(false);
    const [consultFormOpen, setConsultFormOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [l, c] = await Promise.all([fetchLoans(), fetchConsultations()]);
            setLoans(l);
            setConsultations(c);
        } catch {
            if (!silent) toast.error('Impossible de charger les prêts et consultations');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const exportData: Record<string, unknown>[] = useMemo(() => {
        if (activeTab === 'loans') {
            return loans.map((l) => ({
                Type: 'Prêt',
                Référence: l.reference,
                Document: l.documentTitle || '—',
                Emprunteur: l.borrowerName,
                Email: l.borrowerEmail || '—',
                Motif: l.reasonId ? (getItemName('LOAN_REASON', l.reasonId) || l.reasonId) : '—',
                'Date de prêt': l.borrowDate ? formatDate(l.borrowDate) : '—',
                'Date d’échéance': l.dueDate ? formatDate(l.dueDate) : '—',
                Statut: loanStatusLabel(l.status),
            }));
        } else {
            return consultations.map((c) => ({
                Type: 'Consultation',
                Référence: c.reference,
                Document: c.documentTitle || '—',
                Utilisateur: c.userName,
                'Type consultation': c.consultationTypeId ? (getItemName('CONSULTATION_TYPE', c.consultationTypeId) || c.consultationTypeId) : '—',
                'Date consultation': c.consultationDate ? formatDate(c.consultationDate) : '—',
                Durée: c.duration || '—',
                Localisation: c.location || '—',
                Statut: 'Effectuée',
            }));
        }
    }, [activeTab, loans, consultations, getItemName]);

    const [returnTargetLoan, setReturnTargetLoan] = useState<LoanApi | null>(null);
    const [returnLoading, setReturnLoading] = useState(false);

    const handleConfirmReturn = async () => {
        if (!returnTargetLoan) return;
        const id = returnTargetLoan.id;
        const previous = [...loans];
        setReturnLoading(true);
        // Optimistic UI
        setLoans((prev) =>
            prev.map((l) => (l.id === id ? { ...l, status: 'returned' as const, returnedDate: new Date().toISOString() } : l))
        );
        toast.success('Prêt marqué comme retourné avec succès en magasin');
        setReturnTargetLoan(null);
        try {
            await returnLoan(id);
            load(true);
        } catch {
            setLoans(previous);
            toast.error('Erreur lors de l’enregistrement du retour');
        } finally {
            setReturnLoading(false);
        }
    };

    const handleRenew = async (id: string) => {
        const previous = [...loans];
        // Optimistic UI: add 7 days to dueDate
        setLoans((prev) =>
            prev.map((l) => {
                if (l.id === id) {
                    const currentDue = new Date(l.dueDate);
                    currentDue.setDate(currentDue.getDate() + 7);
                    return { ...l, status: 'renewed' as const, dueDate: currentDue.toISOString() };
                }
                return l;
            })
        );
        toast.success('Prêt prolongé de 7 jours');
        try {
            await renewLoan(id, 7);
            load(true);
        } catch {
            setLoans(previous);
            toast.error('Erreur lors de la prolongation');
        }
    };

    const handleDeleteLoan = async (id: string) => {
        if (!confirm('Désactiver ce prêt ?')) return;
        const previous = [...loans];
        // Optimistic UI
        setLoans((prev) => prev.filter((l) => l.id !== id));
        toast.success('Prêt désactivé');
        try {
            await deleteLoan(id);
            load(true);
        } catch (error) {
            setLoans(previous);
            toast.error((error as Error).message || 'Impossible de désactiver le prêt');
        }
    };

    const handleDeleteConsultation = async (id: string) => {
        if (!confirm('Désactiver cette consultation ?')) return;
        const previous = [...consultations];
        // Optimistic UI
        setConsultations((prev) => prev.filter((c) => c.id !== id));
        toast.success('Consultation désactivée');
        try {
            await deleteConsultation(id);
            load(true);
        } catch (error) {
            setConsultations(previous);
            toast.error((error as Error).message || 'Impossible de désactiver la consultation');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Prêts & Consultations"
                subtitle="Gestion et traçabilité des communications, emprunts et consultations de documents"
                icon={<HandHelping className="h-6 w-6" />}
                exportData={exportData}
                exportFilename={activeTab === 'loans' ? 'registre-prets' : 'registre-consultations'}
                exportTitle={activeTab === 'loans' ? 'Registre des Prêts de Documents' : 'Registre des Consultations sur Place'}
                exportColumns={
                    (activeTab === 'loans'
                        ? [
                              { key: 'Référence', label: 'Référence' },
                              { key: 'Document', label: 'Document / Archive' },
                              { key: 'Emprunteur', label: 'Emprunteur' },
                              { key: 'Email', label: 'Courriel' },
                              { key: 'Motif', label: 'Motif' },
                              { key: 'Date d’échéance', label: 'Date d’échéance' },
                              { key: 'Statut', label: 'Statut' },
                          ]
                        : [
                              { key: 'Référence', label: 'Référence' },
                              { key: 'Document', label: 'Document / Archive' },
                              { key: 'Utilisateur', label: 'Demandeur' },
                              { key: 'Type consultation', label: 'Mode consultation' },
                              { key: 'Date consultation', label: 'Date' },
                              { key: 'Durée', label: 'Durée' },
                              { key: 'Localisation', label: 'Emplacement' },
                          ]) as any
                }
                exportMetadata={{
                    subtitle: activeTab === 'loans' ? 'État des emprunts en cours et archivés' : 'Historique des consultations sur place',
                    filterSummary: `${activeTab === 'loans' ? loans.length + ' prêt(s)' : consultations.length + ' consultation(s)'}`,
                }}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setConsultFormOpen(true)} className="gap-2">
                            <Eye className="h-4 w-4" /> Consultation
                        </Button>
                        <Button onClick={() => setLoanFormOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" /> Nouveau prêt
                        </Button>
                    </div>
                }
            />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'loans' | 'consultations')}>
                <TabsList>
                    <TabsTrigger value="loans">Prêts ({loans.length})</TabsTrigger>
                    <TabsTrigger value="consultations">Consultations ({consultations.length})</TabsTrigger>
                </TabsList>

                {/* Onglet Prêts */}
                <TabsContent value="loans" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="space-y-2 p-4">
                                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Référence</TableHead>
                                            <TableHead>Document</TableHead>
                                            <TableHead>Emprunteur</TableHead>
                                            <TableHead>Motif</TableHead>
                                            <TableHead>Date retour</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loans.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                                    Aucun prêt en cours
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            loans.map((l) => (
                                                <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="font-mono text-xs font-semibold">{l.reference}</TableCell>
                                                    <TableCell className="font-medium">{l.documentTitle || '—'}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="text-sm font-medium">{l.borrowerName}</p>
                                                            <p className="text-xs text-muted-foreground">{l.borrowerEmail}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {l.reasonId ? getItemName('LOAN_REASON', l.reasonId) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">{formatDate(l.dueDate)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={loanStatusVariant(l.status)}>
                                                            {loanStatusLabel(l.status)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {(l.status === 'active' || l.status === 'overdue' || l.status === 'renewed') && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleRenew(l.id)}
                                                                        title="Prolonger de 7 jours"
                                                                    >
                                                                        <RefreshCw className="h-4 w-4 text-blue-600" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setReturnTargetLoan(l)}
                                                                        title="Marquer comme retourné"
                                                                    >
                                                                        <Undo2 className="h-4 w-4 text-emerald-600" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {l.status === 'returned' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteLoan(l.id)}
                                                                    title="Désactiver le prêt"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Consultations */}
                <TabsContent value="consultations" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="space-y-2 p-4">
                                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Référence</TableHead>
                                            <TableHead>Document</TableHead>
                                            <TableHead>Demandeur</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Durée</TableHead>
                                            <TableHead>Emplacement</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {consultations.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                                    Aucune consultation enregistrée
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            consultations.map((c) => (
                                                <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="font-mono text-xs font-semibold">{c.reference}</TableCell>
                                                    <TableCell className="font-medium">{c.documentTitle || '—'}</TableCell>
                                                    <TableCell className="text-sm font-medium">{c.userName}</TableCell>
                                                    <TableCell className="text-xs">
                                                        {c.consultationTypeId ? getItemName('CONSULTATION_TYPE', c.consultationTypeId) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">{formatDate(c.consultationDate)}</TableCell>
                                                    <TableCell className="text-xs">{c.duration || '—'}</TableCell>
                                                    <TableCell className="text-xs">{c.location || '—'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteConsultation(c.id)}
                                                            title="Désactiver la consultation"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <LoanFormDialog
                open={loanFormOpen}
                onOpenChange={setLoanFormOpen}
                onSaved={() => load(true)}
            />

            <ConsultationFormDialog
                open={consultFormOpen}
                onOpenChange={setConsultFormOpen}
                onSaved={() => load(true)}
            />

            {/* Modal de Confirmation de Retour de Prêt */}
            <Dialog open={!!returnTargetLoan} onOpenChange={(open) => !open && setReturnTargetLoan(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Undo2 className="h-5 w-5 text-emerald-600" />
                            Confirmer le retour de document
                        </DialogTitle>
                        <DialogDescription>
                            Validation de la réintégration de la pièce physique dans le magasin d'archives.
                        </DialogDescription>
                    </DialogHeader>

                    {returnTargetLoan && (
                        <div className="space-y-3 py-2 text-xs">
                            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 border">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Référence du prêt :</span>
                                    <span className="font-mono font-bold text-foreground">{returnTargetLoan.reference}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Document :</span>
                                    <span className="font-semibold text-foreground truncate max-w-[200px]">{returnTargetLoan.documentTitle || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Emprunteur :</span>
                                    <span className="text-foreground">{returnTargetLoan.borrowerName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date d'échéance :</span>
                                    <span className="font-mono text-muted-foreground">{formatDate(returnTargetLoan.dueDate)}</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                En confirmant, le statut de ce prêt passera à « Retourné » et la traçabilité sera consignée dans le journal d'audit.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setReturnTargetLoan(null)} disabled={returnLoading}>
                            Annuler
                        </Button>
                        <Button onClick={handleConfirmReturn} disabled={returnLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {returnLoading ? 'Enregistrement...' : 'Confirmer le retour'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}