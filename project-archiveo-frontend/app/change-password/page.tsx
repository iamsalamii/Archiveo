'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { Archive, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
    const router = useRouter();
    const { user, logout, changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState<string>('Archiveo@2024');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) return 'Au moins 8 caracteres';
        if (!/[A-Z]/.test(pwd)) return 'Au moins une majuscule';
        if (!/[a-z]/.test(pwd)) return 'Au moins une minuscule';
        if (!/[0-9]/.test(pwd)) return 'Au moins un chiffre';
        if (!/[!@#$%^&*]/.test(pwd)) return 'Au moins un caractere special';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!currentPassword) {
            setError('Mot de passe actuel requis');
            return;
        }

        const validationError = validatePassword(newPassword);
        if (validationError) {
            setError(validationError);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        setLoading(true);
        try {
            const success = await changePassword(currentPassword, newPassword);
            if (success) {
                toast.success('Mot de passe modifie !');
                window.location.href = '/dashboard';
            } else {
                setError('Mot de passe actuel incorrect');
            }
        } catch (err) {
            setError((err as Error).message || 'Erreur lors du changement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Archive className="h-6 w-6" />
                    </div>
                    <CardTitle className="mt-4 flex items-center justify-center gap-2">
                        <Lock className="h-5 w-5" />
                        Changement de mot de passe requis
                    </CardTitle>
                    <CardDescription>
                        Bonjour {user?.firstName}, pour des raisons de securite, vous devez definir un nouveau mot de passe.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-xs">
                                Compte cree avec un mot de passe temporaire a changer.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>Mot de passe actuel</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Par defaut : Archiveo@2024</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Nouveau mot de passe</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Confirmer le nouveau mot de passe</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={logout} className="flex-1">
                                Se deconnecter
                            </Button>
                            <Button type="submit" disabled={loading} className="flex-1">
                                {loading ? 'Changement...' : 'Changer le mot de passe'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}