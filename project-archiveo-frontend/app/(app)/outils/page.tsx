'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/shared/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/contexts/i18n-context';
import { useParameters } from '@/contexts/parameters-context';
import { api } from '@/services/api';
import { getIcon } from '@/utils/icons';
import { ColorBadge } from '@/components/shared/color-badge';
import { getColorClasses } from '@/components/shared/color-badge';
import { cn } from '@/lib/utils';
import type { ParameterGroup, ParameterItem } from '@/types';
import { Wrench, Plus, Pencil, Trash2, Search, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const colorOptions = ['blue', 'indigo', 'emerald', 'amber', 'red', 'violet', 'cyan', 'rose', 'orange', 'teal', 'pink', 'fuchsia', 'slate'];
const iconOptions = ['FileText', 'Folder', 'Archive', 'Mail', 'BarChart3', 'ListChecks', 'StickyNote', 'BookOpen', 'Shield', 'Lock', 'Tag', 'Flag', 'Globe', 'Building', 'Users', 'Bell', 'Clock', 'Database', 'Layers', 'Workflow', 'KeyRound', 'Eye', 'Send', 'PenTool', 'HardDrive', 'FileType', 'Package', 'MapPin', 'Languages', 'BrainCircuit', 'ScanText', 'MessageSquare', 'IdCard', 'ShieldCheck', 'UserCog', 'HandHelping', 'ClipboardList', 'AlarmClock', 'Receipt', 'Gavel', 'Image', 'Video', 'Ruler', 'FolderTree', 'Building2', 'Landmark', 'Network', 'GitBranch', 'Store', 'Library', 'GitMerge', 'ArrowDownAZ', 'Hash', 'CircleDot', 'FileSignature', 'CheckCircle', 'ShieldAlert'];

export default function OutilsPage() {
  const { t } = useI18n();
  const { groups, loading, refresh } = useParameters();
  const [selectedGroupCode, setSelectedGroupCode] = useState<string>('DOC_TYPE');
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ParameterItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ParameterItem | null>(null);
  const [form, setForm] = useState<Partial<ParameterItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dérivation dynamique du groupe actif pour actualisation instantanée
  const selectedGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find((g) => g.code === selectedGroupCode) || groups[0];
  }, [groups, selectedGroupCode]);

  const filteredGroups = useMemo(() => {
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [groups, search]);

  const openNew = () => {
    setEditingItem(null);
    setForm({
      code: '',
      name: '',
      description: '',
      color: 'blue',
      icon: 'FileText',
      order: (selectedGroup?.items.length ?? 0) + 1,
      active: true,
    });
    setEditDialog(true);
  };

  const openEdit = (item: ParameterItem) => {
    setEditingItem(item);
    setForm({ ...item });
    setEditDialog(true);
  };

  const save = async () => {
    if (!selectedGroup) return;
    if (!form.name?.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    if (!form.code?.trim()) {
      toast.error('Le code est obligatoire');
      return;
    }

    try {
      setIsSaving(true);
      if (editingItem && (editingItem.id || editingItem.code)) {
        const targetId = editingItem.id || editingItem.code;
        await api.updateParameterItem(selectedGroup.code, targetId, {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          color: form.color || 'blue',
          icon: form.icon || 'FileText',
          order: form.order ?? 0,
          parentId: form.parentId ?? null,
        });
        toast.success(`Élément « ${form.name} » modifié avec succès`);
      } else {
        const item: ParameterItem = {
          id: '',
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          color: form.color || 'blue',
          icon: form.icon || 'FileText',
          order: form.order ?? ((selectedGroup?.items.length ?? 0) + 1),
          active: form.active ?? true,
          parentId: form.parentId ?? null,
        };
        await api.saveParameterItem(selectedGroup.code, item);
        toast.success(`Élément « ${form.name} » créé avec succès`);
      }

      // Rechargement immédiat et fermeture de la boîte de dialogue
      await refresh();
      setEditDialog(false);
    } catch (error: any) {
      console.error('Erreur lors de l’enregistrement du paramètre:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors de l’enregistrement';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedGroup || !deletingItem) return;
    try {
      setIsDeleting(true);
      const targetId = deletingItem.id || deletingItem.code;
      await api.deleteParameterItem(selectedGroup.code, targetId);
      toast.success(`Élément « ${deletingItem.name} » supprimé`);
      await refresh();
      setDeleteDialog(false);
      setDeletingItem(null);
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la suppression';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  const exportData = selectedGroup
    ? (selectedGroup.items || []).map((i, idx) => ({
        'N°': idx + 1,
        Ordre: i.order,
        Nom: i.name,
        Code: i.code,
        Description: i.description || '-',
        Statut: i.isActive ? 'Actif' : 'Inactif',
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('outils.title')}
        subtitle={t('outils.subtitle')}
        icon={<Wrench className="h-6 w-6" />}
        exportData={exportData}
        exportFilename={`parametres-${(selectedGroup?.code || 'global').toLowerCase()}`}
        exportTitle={`Paramètres Système — ${selectedGroup?.name || 'Général'}`}
        exportMetadata={{
          subtitle: `Groupe : ${selectedGroup?.name} (${selectedGroup?.code}) • ${selectedGroup?.items?.length || 0} éléments`,
          category: 'Paramètres et Configuration Système',
        }}
        actions={
          <Button onClick={openNew} disabled={!selectedGroup} className="gap-2 shadow-sm font-medium">
            <Plus className="h-4 w-4" />
            {t('outils.newItem')}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Groups list */}
        <Card className="h-fit shadow-sm">
          <CardHeader className="pb-3">
            <div className="space-y-2">
              <Input
                placeholder="Rechercher un groupe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] space-y-1 overflow-y-auto px-2 pb-2">
              {filteredGroups.map((g) => {
                const Icon = getIcon(g.icon);
                const active = selectedGroup?.code === g.code;
                return (
                  <button
                    key={g.id || g.code}
                    onClick={() => setSelectedGroupCode(g.code)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                        active ? 'bg-primary-foreground/20 text-white' : getColorClasses(g.color)
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 truncate text-left">{g.name}</span>
                    <Badge
                      variant={active ? 'secondary' : 'outline'}
                      className="text-[10px] px-1.5 py-0 font-bold"
                    >
                      {g.items.length}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Items table */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-card pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedGroup && (() => {
                  const Icon = getIcon(selectedGroup.icon);
                  return (
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shadow-sm', getColorClasses(selectedGroup.color))}>
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle className="text-lg font-bold">{selectedGroup?.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedGroup?.items.length} {t('outils.items').toLowerCase()} configurés • Code Groupe : <span className="font-mono font-semibold text-primary">{selectedGroup?.code}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">{t('common.order')}</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">{t('common.name')}</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">{t('common.code')}</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">{t('common.icon')} / {t('common.color')}</th>
                    <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">{t('common.status')}</th>
                    <th className="px-3.5 py-2.5 text-right text-xs font-bold text-muted-foreground">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGroup?.items && selectedGroup.items.length > 0 ? (
                    selectedGroup.items
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((item) => {
                        const Icon = getIcon(item.icon);
                        return (
                          <tr key={item.id || item.code} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <GripVertical className="h-3 w-3" />
                                <span className="text-xs font-mono font-medium">{item.order}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <p className="font-medium text-sm text-foreground">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground font-semibold">
                                {item.code}
                              </code>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', getColorClasses(item.color))}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <ColorBadge name={item.color || 'slate'} color={item.color} />
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-[11px]">
                                {item.isActive ? t('common.active') : t('common.inactive')}
                              </Badge>
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setDeletingItem(item);
                                    setDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Aucun élément dans ce groupe. Cliquez sur « {t('outils.newItem')} » pour en ajouter un.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('outils.editItem') : t('outils.newItem')}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modifiez les informations de ce paramètre' : `Ajoutez un nouvel élément dans le groupe ${selectedGroup?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">{t('common.code')} *</Label>
                <Input
                  id="code"
                  placeholder="EX: EXP_DIR"
                  value={form.code ?? ''}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order">{t('common.order')}</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.order ?? 1}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">{t('common.name')} *</Label>
              <Input
                id="name"
                placeholder="Libellé du paramètre"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t('common.description')}</Label>
              <Input
                id="description"
                placeholder="Description facultative"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('common.color')}</Label>
                <Select
                  value={form.color ?? 'blue'}
                  onValueChange={(v) => setForm({ ...form, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {colorOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <ColorBadge name={c} color={c} />
                          <span className="capitalize">{c}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('common.icon')}</Label>
                <Select
                  value={form.icon ?? 'FileText'}
                  onValueChange={(v) => setForm({ ...form, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {iconOptions.map((ic) => {
                      const Icon = getIcon(ic);
                      return (
                        <SelectItem key={ic} value={ic}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{ic}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="active" className="text-sm font-medium">{t('common.active')}</Label>
              <Switch
                id="active"
                checked={form.active ?? true}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'élément « {deletingItem?.name} » ({deletingItem?.code}) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
