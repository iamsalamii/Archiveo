'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
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
import { useParameters } from '@/contexts/parameters-context';
import {
    fetchPermissionMatrix,
    createRole,
    deleteRole,
    assignPermissions,
    PermissionMatrixApi,
    PermissionApi,
    RoleDetailApi,
} from '@/services/roles-api';
import {
    Shield,
    Lock,
    KeyRound,
    Eye,
    Clock,
    Save,
    Plus,
    Trash2,
    Loader2,
    CheckSquare,
    Square,
} from 'lucide-react';
import { toast } from 'sonner';

const MODULE_LABELS: Record<string, string> = {
    dashboard: 'Tableau de bord',
    documents: 'Documents',
    archives: 'Archives',
    loans: 'Prets',
    consultations: 'Consultations',
    users: 'Utilisateurs',
    roles: 'Roles & Permissions',
    parameters: 'Parametrage',
    audit: 'Journal audit',
    workflows: 'Workflows',
    correspondence: 'Correspondance',
    settings: 'Configuration',
    profile: 'Profil',
};

export default function SecurityPage() {
    const { getItems } = useParameters();

    // Données du backend
    const [matrix, setMatrix] = useState<PermissionMatrixApi | null>(null);
    const [loadingMatrix, setLoadingMatrix] = useState(true);

    // Dialogs rôles
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleDetailApi | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    // Paramètres de session (locaux pour l'instant)
    const [sessionSettings, setSessionSettings] = useState({
        expiration: 30,
        maxAttempts: 5,
        lockDuration: 15,
        passwordComplexity: 'Elevée',
        twoFactorRequired: true,
        forcePasswordChange: true,
    });

    // Stats pour l'aperçu
    const accessTypes = getItems('ACCESS_TYPE');

    const loadMatrix = useCallback(async () => {
        setLoadingMatrix(true);
        try {
            const data = await fetchPermissionMatrix();
            setMatrix(data);
        } catch (e) {
            toast.error('Impossible de charger la matrice de permissions');
        } finally {
            setLoadingMatrix(false);
        }
    }, []);

    useEffect(() => {
        loadMatrix();
    }, [loadMatrix]);

    const permissionsByModule = useMemo(() => {
        if (!matrix) return {};
        const grouped: Record<string, PermissionApi[]> = {};
        matrix.allPermissions.forEach((p) => {
            if (!grouped[p.module]) grouped[p.module] = [];
            grouped[p.module].push(p);
        });
        return grouped;
    }, [matrix]);

    const modules = useMemo(() => {
        const order = ['dashboard', 'documents', 'archives', 'loans', 'consultations',
            'users', 'roles', 'parameters', 'audit', 'workflows', 'correspondence',
            'settings', 'profile'];
        return Object.keys(permissionsByModule).sort(
            (a, b) => order.indexOf(a) - order.indexOf(b)
        );
    }, [permissionsByModule]);

    const hasPermission = (role: RoleDetailApi, permissionId: string): boolean => {
        return role.permissions.some((p) => p.id === permissionId);
    };

    const isSystemRole = (roleName: string): boolean => {
        return ['Admin', 'User', 'RecordsManager'].includes(roleName);
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            toast.error('Nom du role requis');
            return;
        }
        setSaving(true);
        try {
            await createRole({ name: newRoleName.trim() });
            toast.success('Role cree avec succes');
            setCreateDialogOpen(false);
            setNewRoleName('');
            loadMatrix();
        } catch (e) {
            toast.error((e as Error).message || 'Erreur lors de la creation');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (!confirm(`Supprimer le role "${roleName}" ?`)) return;
        try {
            await deleteRole(roleId);
            toast.success('Role supprime');
            loadMatrix();
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    const openPermissionsDialog = (role: RoleDetailApi) => {
        setSelectedRole(role);
        setSelectedPermissions(role.permissions.map((p) => p.id));
        setPermissionsDialogOpen(true);
    };

    const togglePermission = (permissionId: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const toggleModule = (modulePermissions: PermissionApi[]) => {
        const moduleIds = modulePermissions.map((p) => p.id);
        const allChecked = moduleIds.every((id) => selectedPermissions.includes(id));
        if (allChecked) {
            setSelectedPermissions((prev) => prev.filter((id) => !moduleIds.includes(id)));
        } else {
            setSelectedPermissions((prev) => [...new Set([...prev, ...moduleIds])]);
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await assignPermissions(selectedRole.id, { permissionIds: selectedPermissions });
            toast.success('Permissions mises a jour');
            setPermissionsDialogOpen(false);
            loadMatrix();
        } catch {
            toast.error('Erreur lors de la mise a jour');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSession = () => {
        toast.success('Parametres de securite enregistres');
    };

    if (loadingMatrix || !matrix) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Sécurité & Habilitations"
                subtitle="Matrice des rôles, gestion des permissions et contrôle des accès"
                icon={<Shield className="h-6 w-6" />}
                exportData={matrix.roles.map((r) => ({
                    Rôle: r.name,
                    'Nb Permissions': r.permissions?.length || 0,
                    Permissions: r.permissions?.map((p) => p.code).join(', ') || 'Aucune',
                }))}
                exportFilename="matrice-securite-roles"
                exportTitle="Matrice des Rôles et Permissions"
                exportColumns={[
                    { key: 'Rôle', label: 'Rôle' },
                    { key: 'Nb Permissions', label: 'Nombre de permissions' },
                    { key: 'Permissions', label: 'Permissions accordées' },
                ]}
                exportMetadata={{
                    subtitle: 'Matrice officielle de gouvernance des accès',
                    filterSummary: `${matrix.roles.length} rôle(s) configuré(s)`,
                }}
            />

            {/* Aperçu stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Roles', value: matrix.roles.length, icon: KeyRound, color: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' },
                    { label: 'Permissions', value: matrix.allPermissions.length, icon: Lock, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
                    { label: 'Modules', value: modules.length, icon: Shield, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
                    { label: "Types d'acces", value: accessTypes.length, icon: Eye, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label}>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Tabs defaultValue="matrix">
                <TabsList>
                    <TabsTrigger value="matrix">Matrice RBAC</TabsTrigger>
                    <TabsTrigger value="roles">Gestion des roles</TabsTrigger>
                    <TabsTrigger value="sessions">Sessions & JWT</TabsTrigger>
                </TabsList>

                {/* Onglet 1 : Matrice RBAC */}
                <TabsContent value="matrix" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Matrice des permissions</CardTitle>
                            <CardDescription>
                                Vue d&apos;ensemble des permissions attribuees a chaque role. Cliquez sur l&#39;icone Shield pour modifier.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[280px]">Permission</TableHead>
                                            {matrix.roles.map((role) => (
                                                <TableHead key={role.id} className="text-center min-w-[110px]">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-semibold text-sm">{role.name}</span>
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {role.permissions.length} perm.
                                                        </Badge>
                                                    </div>
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {modules.map((module) => (
                                            <>
                                                <TableRow key={`module-${module}`} className="bg-muted/50">
                                                    <TableCell colSpan={matrix.roles.length + 2} className="font-semibold text-sm">
                                                        {MODULE_LABELS[module] || module}
                                                    </TableCell>
                                                </TableRow>
                                                {permissionsByModule[module].map((permission) => (
                                                    <TableRow key={permission.id}>
                                                        <TableCell className="pl-8">
                                                            <p className="text-sm">{permission.name}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{permission.code}</p>
                                                        </TableCell>
                                                        {matrix.roles.map((role) => (
                                                            <TableCell key={role.id} className="text-center">
                                                                {hasPermission(role, permission.id) ? (
                                                                    <CheckSquare className="h-5 w-5 text-emerald-600 mx-auto" />
                                                                ) : (
                                                                    <Square className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell></TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        ))}
                                        <TableRow className="border-t-2 bg-muted/30">
                                            <TableCell className="font-semibold">Actions</TableCell>
                                            {matrix.roles.map((role) => (
                                                <TableCell key={role.id} className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openPermissionsDialog(role)}
                                                        title="Modifier les permissions"
                                                    >
                                                        <Shield className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            ))}
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet 2 : Gestion des rôles */}
                <TabsContent value="roles" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Liste des roles</span>
                                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                                    <Plus className="h-4 w-4" /> Nouveau role
                                </Button>
                            </CardTitle>
                            <CardDescription>
                                Les roles systeme (Admin, User, RecordsManager) ne peuvent pas etre supprimes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {matrix.roles.map((role) => (
                                    <div
                                        key={role.id}
                                        className="rounded-lg border p-4 hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div>
                                                <p className="font-semibold">{role.name}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {role.permissions.length} permission(s)
                                                </p>
                                            </div>
                                            {isSystemRole(role.name) ? (
                                                <Badge variant="outline" className="text-[10px]">Systeme</Badge>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteRole(role.id, role.name)}
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {role.permissions.slice(0, 5).map((p) => (
                                                <Badge key={p.id} variant="secondary" className="text-[10px]">
                                                    {p.code}
                                                </Badge>
                                            ))}
                                            {role.permissions.length > 5 && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    +{role.permissions.length - 5} autres
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openPermissionsDialog(role)}
                                            className="w-full gap-2"
                                        >
                                            <Shield className="h-3 w-3" /> Gerer les permissions
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet 3 : Sessions & JWT */}
                <TabsContent value="sessions" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" /> Securite des sessions & JWT
                            </CardTitle>
                            <CardDescription>
                                Configuration de l&apos;authentification et des sessions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Expiration de session (minutes)</Label>
                                    <Input
                                        type="number"
                                        value={sessionSettings.expiration}
                                        onChange={(e) => setSessionSettings({
                                            ...sessionSettings,
                                            expiration: parseInt(e.target.value) || 30
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tentatives de connexion max</Label>
                                    <Input
                                        type="number"
                                        value={sessionSettings.maxAttempts}
                                        onChange={(e) => setSessionSettings({
                                            ...sessionSettings,
                                            maxAttempts: parseInt(e.target.value) || 5
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duree du verrouillage (minutes)</Label>
                                    <Input
                                        type="number"
                                        value={sessionSettings.lockDuration}
                                        onChange={(e) => setSessionSettings({
                                            ...sessionSettings,
                                            lockDuration: parseInt(e.target.value) || 15
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Complexite du mot de passe</Label>
                                    <Input
                                        value={sessionSettings.passwordComplexity}
                                        onChange={(e) => setSessionSettings({
                                            ...sessionSettings,
                                            passwordComplexity: e.target.value
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm font-medium">Double authentification obligatoire</span>
                                    <Switch
                                        checked={sessionSettings.twoFactorRequired}
                                        onCheckedChange={(v) => setSessionSettings({ ...sessionSettings, twoFactorRequired: v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="text-sm font-medium">Changement de mot de passe a la premiere connexion</span>
                                    <Switch
                                        checked={sessionSettings.forcePasswordChange}
                                        onCheckedChange={(v) => setSessionSettings({ ...sessionSettings, forcePasswordChange: v })}
                                    />
                                </div>
                            </div>

                            {/* JWT Simulation */}
                            <div className="rounded-lg border bg-muted/30 p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold">Simulation JWT</span>
                                </div>
                                <div className="space-y-1 font-mono text-xs text-muted-foreground">
                                    <p>Token: <span className="text-foreground">eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTAwMDEiLCJyb2xlIjoiQURNSU4ifQ.xxxxx</span></p>
                                    <p>Expiration: <span className="text-foreground">{sessionSettings.expiration} minutes apres emission</span></p>
                                    <p>Algorithme: <span className="text-foreground">HS256</span></p>
                                    <p>Issuer: <span className="text-foreground">archiveo.auth</span></p>
                                </div>
                            </div>

                            <Button onClick={handleSaveSession} className="gap-2">
                                <Save className="h-4 w-4" /> Enregistrer les parametres
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialog Créer un rôle */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Creer un nouveau role</DialogTitle>
                        <DialogDescription>
                            Le role sera cree sans permissions. Attribuez-les ensuite.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nom du role *</Label>
                            <Input
                                value={newRoleName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleName(e.target.value)}
                                placeholder="Ex: Responsable qualite"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateRole} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Creer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Permissions */}
            <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Permissions du role : {selectedRole?.name}</DialogTitle>
                        <DialogDescription>
                            {selectedPermissions.length} permission(s) selectionnee(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {modules.map((module) => {
                            const modulePerms = permissionsByModule[module];
                            const allModuleChecked = modulePerms.every((p) => selectedPermissions.includes(p.id));
                            const someModuleChecked = modulePerms.some((p) => selectedPermissions.includes(p.id));
                            return (
                                <div key={module} className="space-y-2 border rounded-lg p-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b">
                                        <Checkbox
                                            id={`module-${module}`}
                                            checked={allModuleChecked}
                                            ref={undefined}
                                            data-indeterminate={!allModuleChecked && someModuleChecked ? '' : undefined}
                                            onCheckedChange={() => toggleModule(modulePerms)}
                                        />
                                        <label
                                            htmlFor={`module-${module}`}
                                            className="font-semibold text-sm cursor-pointer flex-1"
                                        >
                                            {MODULE_LABELS[module] || module}
                                        </label>
                                        <Badge variant="outline" className="text-[10px]">{modulePerms.length}</Badge>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2 pl-6">
                                        {modulePerms.map((p) => (
                                            <div key={p.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={p.id}
                                                    checked={selectedPermissions.includes(p.id)}
                                                    onCheckedChange={() => togglePermission(p.id)}
                                                />
                                                <label htmlFor={p.id} className="text-xs cursor-pointer flex-1">
                                                    {p.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSavePermissions} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}