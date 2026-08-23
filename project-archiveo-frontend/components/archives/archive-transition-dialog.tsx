'use client';

import { useState } from 'react';
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
import { transitionArchive, ArchiveApi } from '@/services/archives-api';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    archive: ArchiveApi | null;
    onSaved: () => void;
}

export function ArchiveTransitionDialog({ open, onOpenChange, archive, onSaved }: Props) {
    const [loading, setLoading] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [destructionReason, setDestructionReason] = useState('');

    const getAvailableTransitions = () => {
        if (!archive) return [];
        const transitions: Record<string, { label: string; value: string }[]> = {
            CURRENT: [{ label: 'Passer en intermediaire', value: 'INTERMEDIATE' }],
            INTERMEDIATE: [
                { label: 'Passer en definitive', value: 'FINAL' },
                { label: 'Detruire', value: 'DESTROYED' },
            ],
            FINAL: [{ label: 'Detruire', value: 'DESTROYED' }],
        };
        return transitions[archive.status] || [];
    };

    const handleSubmit = async () => {
        if (!archive || !newStatus) {
            toast.error('Veuillez selectionner une transition');
            return;
        }

        if (newStatus === 'DESTROYED' && !destructionReason) {
            toast.error('Veuillez indiquer le motif de destruction');
            return;
        }

        setLoading(true);
        try {
            await transitionArchive(archive.id, {
                newStatus,
                destructionReason: newStatus === 'DESTROYED' ? destructionReason : undefined,
            });
            toast.success('Statut modifie avec succes');
            onSaved();
            onOpenChange(false);
            setNewStatus('');
            setDestructionReason('');
        } catch (e) {
            toast.error((e as Error).message || 'Erreur lors de la transition');
        } finally {
            setLoading(false);
        }
    };

    const transitions = getAvailableTransitions();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Changer le statut de l'archive</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="rounded-lg border p-4 bg-muted/50">
                        <p className="text-sm font-medium">{archive?.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Statut actuel : <span className="font-semibold">{archive?.status}</span>
                        </p>
                    </div>

                    {transitions.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4" />
                            Aucune transition disponible pour ce statut
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>Nouveau statut</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                                    <SelectContent>
                                        {transitions.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {newStatus === 'DESTROYED' && (
                                <div className="space-y-2">
                                    <Label>Motif de destruction *</Label>
                                    <Input
                                        value={destructionReason}
                                        onChange={(e) => setDestructionReason(e.target.value)}
                                        placeholder="Raison de la destruction"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || transitions.length === 0}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}