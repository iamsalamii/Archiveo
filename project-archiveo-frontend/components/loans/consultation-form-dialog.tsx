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
import { createConsultation, CreateConsultationPayload } from '@/services/loans-api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export function ConsultationFormDialog({ open, onOpenChange, onSaved }: Props) {
    const { getItems } = useParameters();
    const [loading, setLoading] = useState(false);
    const [documents, setDocuments] = useState<DocumentApi[]>([]);
    const [form, setForm] = useState<CreateConsultationPayload>({
        documentId: '',
        userName: '',
        consultationTypeId: '',
        duration: '',
        location: '',
    });

    useEffect(() => {
        if (open) {
            fetchDocuments().then(setDocuments).catch(() => setDocuments([]));
            setForm({
                documentId: '',
                userName: '',
                consultationTypeId: '',
                duration: '',
                location: '',
            });
        }
    }, [open]);

    const set = (key: keyof CreateConsultationPayload, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = async () => {
        const missing: string[] = [];
        if (!form.documentId) missing.push('Document');
        if (!form.userName?.trim()) missing.push('Utilisateur');

        if (missing.length > 0) {
            toast.error(`Champs obligatoires manquants : ${missing.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            await createConsultation(form);
            toast.success('Consultation enregistrée avec succès');
            onSaved();
            onOpenChange(false);
        } catch (e) {
            toast.error((e as Error).message || 'Erreur lors de l’enregistrement de la consultation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nouvelle consultation</DialogTitle>
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
                        <Label>Utilisateur *</Label>
                        <Input
                            value={form.userName}
                            onChange={(e) => set('userName', e.target.value)}
                            placeholder="Nom de l'utilisateur"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Type de consultation</Label>
                        <Select value={form.consultationTypeId} onValueChange={(v) => set('consultationTypeId', v)}>
                            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                                {getItems('CONSULTATION_TYPE').map((i) => (
                                    <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Duree</Label>
                            <Input
                                value={form.duration}
                                onChange={(e) => set('duration', e.target.value)}
                                placeholder="ex: 30 min"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Localisation</Label>
                            <Input
                                value={form.location}
                                onChange={(e) => set('location', e.target.value)}
                                placeholder="Salle de lecture"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}