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
import { useParameters } from '@/contexts/parameters-context';
import { fetchDocuments, DocumentApi } from '@/services/documents-api';
import { createLoan, CreateLoanPayload } from '@/services/loans-api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export function LoanFormDialog({ open, onOpenChange, onSaved }: Props) {
    const { getItems } = useParameters();
    const [loading, setLoading] = useState(false);
    const [documents, setDocuments] = useState<DocumentApi[]>([]);
    const [form, setForm] = useState<CreateLoanPayload>({
        documentId: '',
        borrowerName: '',
        borrowerEmail: '',
        loanTypeId: '',
        reasonId: '',
        dueDate: '',
        location: '',
    });

    useEffect(() => {
        if (open) {
            fetchDocuments().then(setDocuments).catch(() => setDocuments([]));
            setForm({
                documentId: '',
                borrowerName: '',
                borrowerEmail: '',
                loanTypeId: '',
                reasonId: '',
                dueDate: '',
                location: '',
            });
        }
    }, [open]);

    const set = (key: keyof CreateLoanPayload, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = async () => {
        const missing: string[] = [];
        if (!form.documentId) missing.push('Document');
        if (!form.borrowerName?.trim()) missing.push('Emprunteur');
        if (!form.dueDate) missing.push('Date de retour');

        if (missing.length > 0) {
            toast.error(`Champs obligatoires manquants : ${missing.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            await createLoan({
                ...form,
                dueDate: new Date(form.dueDate + 'T00:00:00Z').toISOString(),
            });
            toast.success('Prêt créé avec succès');
            onSaved();
            onOpenChange(false);
        } catch (e) {
            toast.error((e as Error).message || 'Erreur lors de la création du prêt');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nouveau pret de document</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Document *</Label>
                        <Select value={form.documentId} onValueChange={(v) => set('documentId', v)}>
                            <SelectTrigger><SelectValue placeholder="Selectionner un document" /></SelectTrigger>
                            <SelectContent>
                                {documents.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Nom de l'emprunteur *</Label>
                        <Input
                            value={form.borrowerName}
                            onChange={(e) => set('borrowerName', e.target.value)}
                            placeholder="Nom complet"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Email de l'emprunteur</Label>
                        <Input
                            type="email"
                            value={form.borrowerEmail}
                            onChange={(e) => set('borrowerEmail', e.target.value)}
                            placeholder="email@exemple.com"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Type de pret</Label>
                            <Select value={form.loanTypeId} onValueChange={(v) => set('loanTypeId', v)}>
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    {getItems('LOAN_TYPE').map((i) => (
                                        <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Motif</Label>
                            <Select value={form.reasonId} onValueChange={(v) => set('reasonId', v)}>
                                <SelectTrigger><SelectValue placeholder="Motif" /></SelectTrigger>
                                <SelectContent>
                                    {getItems('LOAN_REASON').map((i) => (
                                        <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Date de retour prevue *</Label>
                        <Input
                            type="date"
                            value={form.dueDate}
                            onChange={(e) => set('dueDate', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Localisation</Label>
                        <Input
                            value={form.location}
                            onChange={(e) => set('location', e.target.value)}
                            placeholder="Ou se trouve le document"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Creer le pret
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}