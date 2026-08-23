'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { Lock, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export function FirstLoginDialog() {
  const { mustChangePassword, changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (!mustChangePassword) return null;

  const handleSubmit = () => {
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!currentPassword) {
      setError('Le mot de passe actuel est requis');
      return;
    }
    void changePassword(currentPassword, password);
    setCurrentPassword('');
    setPassword('');
    setConfirm('');
    setError('');
  };

  return (
    <Dialog open={mustChangePassword} onOpenChange={() => {}}>
      <DialogContent className="max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <DialogTitle>Première connexion</DialogTitle>
          <DialogDescription>
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe
            avant d'accéder à l'application.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="w-full">
            Définir mon mot de passe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
