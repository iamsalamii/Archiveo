'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useParameters } from '@/contexts/parameters-context';
import {
    fetchUsers,
    fetchRoles,
    createUser,
    updateUser,
    deleteUser,
    assignRoles,
    resetPassword,
    UserApi,
    RoleApi,
} from '@/services/users-api';
import {
    Users,
    Plus,
    Search,
    Trash2,
    Pencil,
    Shield,
    Key,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
    const { getItemName, getItems } = useParameters();
    const [users, setUsers] = useState<UserApi[]>([]);
    const [roles, setRoles] = useState<RoleApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [editing, setEditing] = useState<UserApi | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserApi | null>(null);

    // Forms
    const [form, setForm] = useState({
        userName: '',
        email: '',
        firstName: '',
        lastName: '',
        function: '',
        matricule: '',
        serviceId: '',
        password: '',
        roles: [] as string[],
    });
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [newPassword, setNewPassword] = useState('Archiveo@2024');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [u, r] = await Promise.all([fetchUsers(), fetchRoles()]);
            setUsers(u);
            setRoles(r);
        } catch {
            if (!silent) toast.error('Impossible de charger les utilisateurs');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const matchSearch =
                u.userName.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase()) ||
                u.firstName.toLowerCase().includes(search.toLowerCase()) ||
                u.lastName.toLowerCase().includes(search.toLowerCase());
            const matchRole =
                roleFilter === 'all' || u.roles.includes(roleFilter);
            return matchSearch && matchRole;
        });
    }, [users, search, roleFilter]);

    const exportData = useMemo(() => {
        return filtered.map((u) => ({
            'Nom & Prénom': `${u.firstName} ${u.lastName}`,
            Identifiant: u.userName,
            Courriel: u.email,
            Matricule: u.matricule || '—',
            Fonction: u.function || '—',
            Service: u.serviceId ? (getItemName('SERVICE', u.serviceId) || u.serviceId) : '—',
            Rôles: u.roles.join(', ') || 'Aucun rôle',
            'Changement MDP requis': u.mustChangePassword ? 'Oui' : 'Non',
        }));
    }, [filtered, getItemName]);

    const stats = useMemo(() => {
        const total = users.length;
        const admins = users.filter((u) => u.roles.includes('Admin')).length;
        const recordsManagers = users.filter((u) => u.roles.includes('RecordsManager')).length;
        const mustChange = users.filter((u) => u.mustChangePassword).length;
        return { total, admins, recordsManagers, mustChange };
    }, [users]);

    const openCreateDialog = () => {
        setEditing(null);
        setForm({
            userName: '',
            email: '',
            firstName: '',
            lastName: '',
            function: '',
            matricule: '',
            serviceId: '',
            password: '',
            roles: [],
        });
        setFormOpen(true);
    };

    const openEditDialog = (user: UserApi) => {
        setEditing(user);
        setForm({
            userName: user.userName,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            function: user.function || '',
            matricule: user.matricule || '',
            serviceId: user.serviceId || '',
            password: '',
            roles: user.roles,
        });
        setFormOpen(true);
    };

    const openRolesDialog = (user: UserApi) => {
        setSelectedUser(user);
        setSelectedRoles(user.roles);
        setRolesDialogOpen(true);
    };

    const openPasswordDialog = (user: UserApi) => {
        setSelectedUser(user);
        setNewPassword('Archiveo@2024');
        setPasswordDialogOpen(true);
    };

    const handleSaveUser = async () => {
        const missing: string[] = [];
        if (!form.userName?.trim()) missing.push('Identifiant');
        if (!form.email?.trim()) missing.push('Email');
        if (!form.firstName?.trim()) missing.push('Prénom');
        if (!form.lastName?.trim()) missing.push('Nom');

        if (missing.length > 0) {
            toast.error(`Champs obligatoires manquants : ${missing.join(', ')}`);
            return;
        }

        setSaving(true);
        const previousUsers = [...users];

        if (editing) {
            // Optimistic update
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editing.id
                        ? {
                              ...u,
                              userName: form.userName,
                              email: form.email,
                              firstName: form.firstName,
                              lastName: form.lastName,
                              function: form.function || undefined,
                              matricule: form.matricule || undefined,
                              serviceId: form.serviceId || undefined,
                          }
                        : u
                )
            );
        }

        try {
            if (editing) {
                await updateUser(editing.id, {
                    userName: form.userName,
                    email: form.email,
                    firstName: form.firstName,
                    lastName: form.lastName,
                    function: form.function || undefined,
                    matricule: form.matricule || undefined,
                    serviceId: form.serviceId || undefined,
                });
                toast.success('Utilisateur mis à jour');
            } else {
                await createUser({
                    userName: form.userName,
                    email: form.email,
                    firstName: form.firstName,
                    lastName: form.lastName,
                    function: form.function || undefined,
                    matricule: form.matricule || undefined,
                    serviceId: form.serviceId || undefined,
                    password: form.password || undefined,
                    roles: form.roles,
                });
                toast.success('Utilisateur créé avec succès');
            }
            setFormOpen(false);
            load(true);
        } catch (e) {
            if (editing) setUsers(previousUsers);
            toast.error((e as Error).message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRoles = async () => {
        if (!selectedUser) return;
        setSaving(true);
        const previousUsers = [...users];
        // Optimistic UI
        setUsers((prev) =>
            prev.map((u) => (u.id === selectedUser.id ? { ...u, roles: selectedRoles } : u))
        );
        try {
            await assignRoles(selectedUser.id, selectedRoles);
            toast.success('Rôles mis à jour');
            setRolesDialogOpen(false);
            load(true);
        } catch (e) {
            setUsers(previousUsers);
            toast.error((e as Error).message || 'Erreur lors de l\'attribution des rôles');
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser) return;
        if (!newPassword || newPassword.length < 6) {
            toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        setSaving(true);
        try {
            await resetPassword(selectedUser.id, newPassword);
            toast.success('Mot de passe réinitialisé');
            setPasswordDialogOpen(false);
            load(true);
        } catch (e) {
            toast.error((e as Error).message || 'Erreur lors de la réinitialisation');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cet utilisateur ?')) return;
        const previous = [...users];
        // Optimistic UI
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast.success('Utilisateur supprimé');
        try {
            await deleteUser(id);
            load(true);
        } catch {
            setUsers(previous);
            toast.error('Erreur lors de la suppression');
        }
    };

    const toggleRole = (role: string) => {
        setForm((f) => ({
            ...f,
            roles: f.roles.includes(role)
                ? f.roles.filter((r) => r !== role)
                : [...f.roles, role],
        }));
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Utilisateurs"
                subtitle="Gestion des comptes, des attributions de rôles et de la sécurité des accès"
                icon={<Users className="h-6 w-6" />}
                exportData={exportData}
                exportFilename="registre-utilisateurs-archiveo"
                exportTitle="Annuaire et Registre des Utilisateurs"
                exportColumns={[
                    { key: 'Nom & Prénom', label: 'Nom & Prénom' },
                    { key: 'Identifiant', label: 'Identifiant' },
                    { key: 'Courriel', label: 'Courriel' },
                    { key: 'Matricule', label: 'Matricule' },
                    { key: 'Fonction', label: 'Fonction' },
                    { key: 'Service', label: 'Service' },
                    { key: 'Rôles', label: 'Rôles & Permissions' },
                ]}
                exportMetadata={{
                    subtitle: 'Liste des comptes habilités et affectations',
                    filterSummary: `${filtered.length} utilisateur(s) actif(s)`,
                }}
                actions={
                    <Button onClick={openCreateDialog} className="gap-2">
                        <Plus className="h-4 w-4" /> Nouvel utilisateur
                    </Button>
                }
            />

            {/* Statistiques */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Total utilisateurs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">{stats.admins}</p>
                        <p className="text-xs text-muted-foreground">Administrateurs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">{stats.recordsManagers}</p>
                        <p className="text-xs text-muted-foreground">Records Managers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">{stats.mustChange}</p>
                        <p className="text-xs text-muted-foreground">Doivent changer le MDP</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtres */}
            <Card>
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher (nom, email, prénom)..."
                            className="pl-9"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger><SelectValue placeholder="Filtrer par rôle" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les rôles</SelectItem>
                            {roles.map((r) => (
                                <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Table */}
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
                                    <TableHead>Utilisateur</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Fonction</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Rôles</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            Aucun utilisateur trouvé
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((u) => (
                                        <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{u.userName}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{u.email}</TableCell>
                                            <TableCell className="text-sm">{u.function || '—'}</TableCell>
                                            <TableCell className="text-sm">
                                                {u.serviceId ? getItemName('SERVICE', u.serviceId) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {u.roles.map((r) => (
                                                        <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openRolesDialog(u)}
                                                        title="Gérer les rôles"
                                                    >
                                                        <Shield className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openPasswordDialog(u)}
                                                        title="Réinitialiser le mot de passe"
                                                    >
                                                        <Key className="h-4 w-4 text-amber-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(u)}
                                                        title="Modifier"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(u.id)}
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
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

            {/* Dialog Créer/Modifier */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Nom d'utilisateur *</Label>
                            <Input
                                value={form.userName}
                                onChange={(e) => setForm({ ...form, userName: e.target.value })}
                                placeholder="jdupont"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="jean.dupont@archiveo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Prénom *</Label>
                            <Input
                                value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                placeholder="Jean"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nom *</Label>
                            <Input
                                value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                placeholder="Dupont"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fonction</Label>
                            <Input
                                value={form.function}
                                onChange={(e) => setForm({ ...form, function: e.target.value })}
                                placeholder="Documentaliste"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Matricule</Label>
                            <Input
                                value={form.matricule}
                                onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                                placeholder="MAT001"
                            />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Service</Label>
                            <Select
                                value={form.serviceId}
                                onValueChange={(v) => setForm({ ...form, serviceId: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Sélectionner un service" /></SelectTrigger>
                                <SelectContent>
                                    {getItems('SERVICE').map((i) => (
                                        <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {!editing && (
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Mot de passe initial</Label>
                                <Input
                                    type="text"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Archiveo@2024"
                                />
                                <p className="text-xs text-muted-foreground">
                                    L'utilisateur devra changer ce mot de passe à la première connexion
                                </p>
                            </div>
                        )}
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Rôles</Label>
                            <div className="grid gap-2 sm:grid-cols-3">
                                {roles.map((r) => (
                                    <div key={r.name} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`role-${r.name}`}
                                            checked={form.roles.includes(r.name)}
                                            onCheckedChange={() => toggleRole(r.name)}
                                        />
                                        <label htmlFor={`role-${r.name}`} className="text-sm">{r.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveUser} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editing ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Rôles */}
            <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gérer les rôles de {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {roles.map((r) => (
                            <div key={r.name} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`role-manage-${r.name}`}
                                    checked={selectedRoles.includes(r.name)}
                                    onCheckedChange={(checked) => {
                                        setSelectedRoles((prev) =>
                                            checked ? [...prev, r.name] : prev.filter((x) => x !== r.name)
                                        );
                                    }}
                                />
                                <label htmlFor={`role-manage-${r.name}`} className="text-sm">{r.name}</label>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRolesDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveRoles} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Reset Password */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Utilisateur : <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>
                        </p>
                        <div className="space-y-2">
                            <Label>Nouveau mot de passe</Label>
                            <Input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Archiveo@2024"
                            />
                            <p className="text-xs text-muted-foreground">
                                L'utilisateur devra changer ce mot de passe à la prochaine connexion
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleResetPassword} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Réinitialiser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}