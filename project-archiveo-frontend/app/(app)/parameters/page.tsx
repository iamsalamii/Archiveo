'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useParameters } from '@/contexts/parameters-context';
import { getIcon } from '@/utils/icons';
import { Settings, Plus, Trash2, Folder, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ParameterItemApi, ParameterGroupApi } from '@/services/api';

const COLORS = [
    { code: 'blue', label: 'Bleu' },
    { code: 'green', label: 'Vert' },
    { code: 'red', label: 'Rouge' },
    { code: 'orange', label: 'Orange' },
    { code: 'purple', label: 'Violet' },
    { code: 'cyan', label: 'Cyan' },
    { code: 'gray', label: 'Gris' },
];

const ICONS = [
    'Folder', 'FolderOpen', 'FileText', 'File', 'Building', 'Building2',
    'MapPin', 'Map', 'Globe', 'HardDrive', 'Shield', 'Lock', 'Package',
    'CheckCircle', 'Trash2', 'Tag', 'Hash', 'Library', 'Database', 'Layers',
    'User', 'UserCog', 'PenTool', 'Mail', 'Workflow', 'BookOpen', 'Eye',
    'Key', 'Users', 'Bell', 'Clock', 'MessageSquare', 'Scan', 'Brain',
];

export default function ParametersPage() {
    const { groups, isLoading, getItems, createGroup, createItem, updateItem, removeItem } = useParameters();
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [newGroupCode, setNewGroupCode] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [saving, setSaving] = useState(false);

    // Dialog d'edition
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ParameterItemApi | null>(null);
    const [editForm, setEditForm] = useState({
        code: '',
        name: '',
        description: '',
        color: '',
        icon: '',
    });

    // Dialog d'ajout d'item
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        code: '',
        name: '',
        description: '',
        color: '',
        icon: '',
    });

    const currentGroup = groups.find((g: ParameterGroupApi) => g.code === selectedGroup);
    const items = selectedGroup ? getItems(selectedGroup) : [];

    const handleAddGroup = async () => {
        if (!newGroupCode.trim() || !newGroupName.trim()) {
            toast.error('Code et nom du groupe requis');
            return;
        }
        setSaving(true);
        try {
            await createGroup({
                code: newGroupCode.trim().toUpperCase(),
                name: newGroupName.trim(),
                order: groups.length + 1,
            });
            toast.success('Groupe cree avec succes');
            setNewGroupCode('');
            setNewGroupName('');
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenAddDialog = () => {
        setAddForm({ code: '', name: '', description: '', color: '', icon: '' });
        setAddDialogOpen(true);
    };

    const handleCreateItem = async () => {
        if (!selectedGroup) return;
        if (!addForm.code.trim() || !addForm.name.trim()) {
            toast.error('Code et nom requis');
            return;
        }
        setSaving(true);
        try {
            await createItem(selectedGroup, {
                code: addForm.code.trim().toUpperCase(),
                name: addForm.name.trim(),
                description: addForm.description.trim() || undefined,
                color: addForm.color || undefined,
                icon: addForm.icon || undefined,
                order: items.length + 1,
            });
            toast.success('Element ajoute avec succes');
            setAddDialogOpen(false);
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenEditDialog = (item: ParameterItemApi) => {
        console.log('[DEBUG] Ouverture edition pour:', item);
        setEditingItem(item);
        setEditForm({
            code: item.code,
            name: item.name,
            description: item.description || '',
            color: item.color || '',
            icon: item.icon || '',
        });
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        console.log('[DEBUG] handleSaveEdit - editingItem:', editingItem);
        console.log('[DEBUG] handleSaveEdit - editForm:', editForm);

        if (!editingItem || !selectedGroup) {
            console.error('[ERROR] editingItem ou selectedGroup null');
            return;
        }
        if (!editForm.code.trim() || !editForm.name.trim()) {
            toast.error('Code et nom requis');
            return;
        }

        setSaving(true);
        try {
            console.log('[DEBUG] Appel de updateItem...');
            await updateItem(selectedGroup, editingItem.id, {
                code: editForm.code.trim().toUpperCase(),
                name: editForm.name.trim(),
                description: editForm.description.trim() || undefined,
                color: editForm.color || undefined,
                icon: editForm.icon || undefined,
                order: editingItem.order,
            });
            console.log('[DEBUG] updateItem reussi');
            toast.success('Element modifie avec succes');
            setEditDialogOpen(false);
            setEditingItem(null);
        } catch (e) {
            console.error('[ERROR] Erreur updateItem:', e);
            toast.error((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!selectedGroup) return;
        if (!confirm('Supprimer cet element ?')) return;
        setSaving(true);
        try {
            await removeItem(selectedGroup, itemId);
            toast.success('Element supprime avec succes');
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-16 w-full" />
                <div className="grid gap-4 lg:grid-cols-3">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96 lg:col-span-2" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Parametrage"
                subtitle={`${groups.length} groupes configurables`}
                icon={<Settings className="h-6 w-6" />}
            />

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Liste des groupes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Groupes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="max-h-[500px] space-y-1 overflow-y-auto pr-1">
                            {groups.map((g: ParameterGroupApi) => {
                                const Icon = getIcon(g.icon || 'Folder');
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => setSelectedGroup(g.code)}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-muted',
                                            selectedGroup === g.code && 'bg-primary/10 border-primary'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="flex-1 truncate">{g.name}</span>
                                        <Badge variant="secondary" className="text-[10px]">{g.items.length}</Badge>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-2 border-t pt-3">
                            <Label className="text-xs">Nouveau groupe</Label>
                            <Input
                                value={newGroupCode}
                                onChange={(e) => setNewGroupCode(e.target.value.toUpperCase())}
                                placeholder="Code (ex: BUREAU)"
                            />
                            <Input
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Nom (ex: Bureaux)"
                            />
                            <Button size="sm" className="w-full gap-2" onClick={handleAddGroup} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Ajouter le groupe
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Elements du groupe */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-primary" />
                                {currentGroup ? currentGroup.name : 'Selectionnez un groupe'}
                            </div>
                            {currentGroup && (
                                <Button size="sm" onClick={handleOpenAddDialog} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Ajouter
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!currentGroup ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Cliquez sur un groupe a gauche pour voir et gerer ses elements.
                            </p>
                        ) : (
                            <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                                {items.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        Aucun element dans ce groupe.
                                    </p>
                                ) : (
                                    items.map((item: ParameterItemApi) => (
                                        <div key={item.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                                            {item.color && (
                                                <div
                                                    className="h-8 w-8 rounded-full border"
                                                    style={{ backgroundColor: `var(--color-${item.color}, hsl(var(--primary)))` }}
                                                />
                                            )}
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEditDialog(item)}
                                                disabled={saving}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteItem(item.id)}
                                                disabled={saving}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Dialog AJOUT */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un element</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Code *</Label>
                            <Input
                                value={addForm.code}
                                onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                                placeholder="CODE_UNIQUE"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nom *</Label>
                            <Input
                                value={addForm.name}
                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                placeholder="Nom affiche"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={addForm.description}
                                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                placeholder="Description optionnelle"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Couleur</Label>
                            <Select value={addForm.color} onValueChange={(v) => setAddForm({ ...addForm, color: v })}>
                                <SelectTrigger><SelectValue placeholder="Choisir une couleur" /></SelectTrigger>
                                <SelectContent>
                                    {COLORS.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Icone</Label>
                            <Select value={addForm.icon} onValueChange={(v) => setAddForm({ ...addForm, icon: v })}>
                                <SelectTrigger><SelectValue placeholder="Choisir une icone" /></SelectTrigger>
                                <SelectContent>
                                    {ICONS.map((i) => (
                                        <SelectItem key={i} value={i}>{i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateItem} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Ajouter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog MODIFICATION */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier l'element</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Code *</Label>
                            <Input
                                value={editForm.code}
                                onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nom *</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Description optionnelle"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Couleur</Label>
                            <Select value={editForm.color} onValueChange={(v) => setEditForm({ ...editForm, color: v })}>
                                <SelectTrigger><SelectValue placeholder="Choisir une couleur" /></SelectTrigger>
                                <SelectContent>
                                    {COLORS.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Icone</Label>
                            <Select value={editForm.icon} onValueChange={(v) => setEditForm({ ...editForm, icon: v })}>
                                <SelectTrigger><SelectValue placeholder="Choisir une icone" /></SelectTrigger>
                                <SelectContent>
                                    {ICONS.map((i) => (
                                        <SelectItem key={i} value={i}>{i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveEdit} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}