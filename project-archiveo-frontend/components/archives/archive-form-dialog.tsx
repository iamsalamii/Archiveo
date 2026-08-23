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
import { useParameters } from '@/contexts/parameters-context';
import {
    createArchive,
    updateArchive,
    ArchiveApi,
    CreateArchivePayload,
} from '@/services/archives-api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    archive?: ArchiveApi | null;
    onSaved: () => void;
}

export function ArchiveFormDialog({ open, onOpenChange, archive, onSaved }: Props) {
    const { getItems } = useParameters();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<CreateArchivePayload>({
        title: '',
        description: '',
        typeId: '',
        categoryId: '',
        serviceId: '',
        departmentId: '',
        retentionDate: undefined,
        siteId: '',
        locationId: '',
        boxReference: '',
        shelfReference: '',
    });

    useEffect(() => {
        if (archive) {
            setForm({
                title: archive.title,
                description: archive.description || '',
                typeId: archive.typeId,
                categoryId: archive.categoryId,
                serviceId: archive.serviceId || '',
                departmentId: archive.departmentId || '',
                retentionDate: archive.retentionDate,
                siteId: archive.siteId || '',
                locationId: archive.locationId || '',
                boxReference: archive.boxReference || '',
                shelfReference: archive.shelfReference || '',
            });
        } else {
            setForm({
                title: '',
                description: '',
                typeId: '',
                categoryId: '',
                serviceId: '',
                departmentId: '',
                retentionDate: undefined,
                siteId: '',
                locationId: '',
                boxReference: '',
                shelfReference: '',
            });
        }
    }, [archive, open]);

    const set = (key: keyof CreateArchivePayload, value: string | undefined) =>
        setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = async () => {
        const missing: string[] = [];
        if (!form.title?.trim()) missing.push('Titre');
        if (!form.typeId) missing.push('Type');
        if (!form.categoryId) missing.push('Catégorie');

        if (missing.length > 0) {
            toast.error(`Champs obligatoires manquants : ${missing.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            if (archive) {
                await updateArchive(archive.id, form);
                toast.success('Archive mise à jour avec succès');
            } else {
                await createArchive(form);
                toast.success('Archive créée avec succès');
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
                    <DialogTitle>{archive ? 'Modifier l\'archive' : 'Nouvelle archive'}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-2">
                        <Label>Titre *</Label>
                        <Input
                            value={form.title}
                            onChange={(e) => set('title', e.target.value)}
                            placeholder="Titre de l'archive"
                        />
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={form.description}
                            onChange={(e) => set('description', e.target.value)}
                            placeholder="Description..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Type d'archive *</Label>
                        <Select value={form.typeId} onValueChange={(v) => set('typeId', v)}>
                            <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                            <SelectContent>
                                {getItems('ARCHIVE_TYPE').map((i) => (
                                    <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Categorie *</Label>
                        <Select value={form.categoryId} onValueChange={(v) => set('categoryId', v)}>
                            <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                            <SelectContent>
                                {getItems('CATEGORY').map((i) => (
                                    <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Service</Label>
                        <Select value={form.serviceId || ''} onValueChange={(v) => set('serviceId', v)}>
                            <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                            <SelectContent>
                                {getItems('SERVICE').map((i) => (
                                    <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Date de retention</Label>
                        <Input
                            type="date"
                            value={form.retentionDate ? form.retentionDate.slice(0, 10) : ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                set('retentionDate', value ? new Date(value + 'T00:00:00Z').toISOString() : undefined);
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Site</Label>
                        <Select value={form.siteId || ''} onValueChange={(v) => set('siteId', v)}>
                            <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                            <SelectContent>
                                {getItems('SITE').map((i) => (
                                    <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Localisation</Label>
                        <Select value={form.locationId || ''} onValueChange={(v) => set('locationId', v)}>
                            <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                            <SelectContent>
                                {getItems('LOCATION').map((i) => (
                                    <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Reference boite</Label>
                        <Input
                            value={form.boxReference}
                            onChange={(e) => set('boxReference', e.target.value)}
                            placeholder="BOX-001"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Reference etagere</Label>
                        <Input
                            value={form.shelfReference}
                            onChange={(e) => set('shelfReference', e.target.value)}
                            placeholder="ETA-001"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {archive ? 'Enregistrer' : 'Creer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}