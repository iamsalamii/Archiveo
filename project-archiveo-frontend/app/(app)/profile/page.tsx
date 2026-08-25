'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParameterSelect } from '@/components/shared/parameter-select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/contexts/i18n-context';
import { toast } from 'sonner';
import { UserCircle, Lock, Bell, Globe, Monitor, History, Loader2, KeyRound } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser, changePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useI18n();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [directionId, setDirectionId] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setServiceId(user.serviceId || '');
      setDirectionId(user.directionId || '');
    }
  }, [user]);

  if (!user) return null;

  const initials = `${(user.firstName || 'A')[0]}${(user.lastName || 'U')[0]}`.toUpperCase();

  const handleSaveInfo = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Le prénom, le nom et l’adresse email sont obligatoires.');
      return;
    }
    setSavingInfo(true);
    try {
      const success = await updateUser({
        ...user,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        serviceId: serviceId || undefined,
        directionId: directionId || undefined,
      });

      if (success) {
        toast.success('Profil mis à jour avec succès !');
      } else {
        toast.error('Erreur lors de la mise à jour du profil');
      }
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      toast.error('Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setSavingPassword(true);
    try {
      const success = await changePassword(currentPassword, newPassword);
      if (success) {
        toast.success('Votre mot de passe a été modifié avec succès !');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error('Mot de passe actuel incorrect ou non conforme.');
      }
    } catch (e) {
      toast.error((e as Error).message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon profil"
        icon={<UserCircle className="h-6 w-6" />}
        exportData={[
          { Champ: 'Nom complet', Valeur: `${user.firstName} ${user.lastName}` },
          { Champ: 'Matricule', Valeur: user.matricule || '—' },
          { Champ: 'Email', Valeur: user.email },
          { Champ: 'Fonction', Valeur: user.function || '—' },
          { Champ: 'Statut', Valeur: user.active ? 'Actif' : 'Inactif' },
        ]}
        exportColumns={[
          { key: 'Champ', label: 'Propriété / Champ' },
          { key: 'Valeur', label: 'Valeur' },
        ]}
        exportFilename={`fiche-profil-${(user.matricule || 'utilisateur').toLowerCase()}`}
        exportTitle={`Fiche Profil — ${user.firstName} ${user.lastName}`}
      />

      {/* Profile header */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
            <p className="text-sm text-muted-foreground">{user.function || 'Collaborateur Archivéo'}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">{user.matricule || 'MAT-001'}</Badge>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                {user.active ? 'Actif' : 'Inactif'}
              </Badge>
              {user.twoFactorEnabled && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" /> 2FA
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="signature">Signature & PIN</TabsTrigger>
          <TabsTrigger value="password">Mot de passe</TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="log">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="signature">
          <SignatureProfileSettings userId={user.id} userName={`${user.firstName} ${user.lastName}`} />
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations personnelles</CardTitle>
              <CardDescription className="text-xs">Modifiez vos informations de profil et vos coordonnées professionnelles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1.5">
                  <Label>Prénom *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom de famille" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email professionnel *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresse@entreprise.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 00 00 00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Service d'affectation</Label>
                  <ParameterSelect groupCode="SERVICE" value={serviceId} onValueChange={setServiceId} />
                </div>
                <div className="space-y-1.5">
                  <Label>Direction de rattachement</Label>
                  <ParameterSelect groupCode="DIRECTION" value={directionId} onValueChange={setDirectionId} />
                </div>
              </div>
              <Button onClick={handleSaveInfo} disabled={savingInfo} className="gap-2 text-xs">
                {savingInfo && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Changer le mot de passe
              </CardTitle>
              <CardDescription className="text-xs">
                Pour sécuriser votre compte, utilisez un mot de passe robuste d'au moins 8 caractères.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-1.5 text-xs">
                <Label>Mot de passe actuel *</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>
              <div className="space-y-1.5 text-xs">
                <Label>Nouveau mot de passe *</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                />
              </div>
              <div className="space-y-1.5 text-xs">
                <Label>Confirmer le nouveau mot de passe *</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                />
              </div>
              <Button onClick={handleSavePassword} disabled={savingPassword} className="gap-2 text-xs">
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Changer le mot de passe
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Préférences d'affichage & Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Langue de l'interface</Label>
                <div className="flex gap-2">
                  <Button variant={locale === 'fr' ? 'default' : 'outline'} size="sm" onClick={() => setLocale('fr')}>Français</Button>
                  <Button variant={locale === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLocale('en')}>English</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Thème visuel</Label>
                <div className="flex gap-2">
                  {([
                    { val: 'light' as const, label: 'Clair' },
                    { val: 'dark' as const, label: 'Sombre' },
                    { val: 'system' as const, label: 'Système' },
                  ]).map((opt) => (
                    <Button key={opt.val} variant={theme === opt.val ? 'default' : 'outline'} size="sm" onClick={() => setTheme(opt.val)}>
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm">Notifications par email</span>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm">Mode compact</span>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader><CardTitle className="text-base">Sessions actives</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { device: 'Navigateur Web — Actuel', ip: 'Poste local', current: true, last: 'Connecté' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{s.device}</p>
                    <p className="text-xs text-muted-foreground">{s.ip} — {s.last}</p>
                  </div>
                  {s.current && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Session active</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log">
          <Card>
            <CardHeader><CardTitle className="text-base">Historique de mes actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { action: 'Connexion réussie', date: 'Session en cours', ip: 'Sécurisé' },
              ].map((entry, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{entry.action}</span>
                  <span className="text-muted-foreground ml-auto">{entry.date}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SignatureProfileSettings({ userId, userName }: { userId: string; userName: string }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [requirePin, setRequirePin] = useState(true);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPin = localStorage.getItem(`archiveo_pin_${userId}`) || '';
      const savedReq = localStorage.getItem(`archiveo_require_pin_${userId}`) !== 'false';
      const savedSig = localStorage.getItem(`archiveo_signature_data_${userId}`);
      setPin(savedPin);
      setConfirmPin(savedPin);
      setRequirePin(savedReq);
      if (savedSig) {
        setSignatureData(savedSig);
      }
    }
  }, [userId]);

  const handleSavePin = () => {
    if (pin && pin.length < 4) {
      toast.error('Le code PIN doit comporter au moins 4 chiffres.');
      return;
    }
    if (pin !== confirmPin) {
      toast.error('Les deux codes PIN saisis ne correspondent pas.');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`archiveo_pin_${userId}`, pin);
      localStorage.setItem(`archiveo_require_pin_${userId}`, String(requirePin));
      if (signatureData) {
        localStorage.setItem(`archiveo_signature_data_${userId}`, signatureData);
      }
    }
    toast.success('Paramètres de signature et code PIN enregistrés avec succès !');
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const [calligraphyIndex, setCalligraphyIndex] = useState(0);

  const generateCalligraphy = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fond blanc propre
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 440, 160);

    const nextIndex = (calligraphyIndex + 1) % 3;
    setCalligraphyIndex(nextIndex);

    const nameToRender = userName && userName.trim().length > 0 ? userName : 'Utilisateur Archivéo';

    if (nextIndex === 0) {
      // Style 1 : Cursive élégante bleue avec trait sous-jacent
      ctx.font = 'italic bold 34px "Brush Script MT", "Segoe Script", "Dancing Script", cursive, sans-serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nameToRender, 220, 65);

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(60, 105);
      ctx.quadraticCurveTo(220, 125, 380, 95);
      ctx.stroke();
    } else if (nextIndex === 1) {
      // Style 2 : Signature dynamique expressive avec arabesque
      ctx.font = 'italic bold 32px "Lucida Handwriting", "Segoe Script", cursive, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nameToRender, 210, 60);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 110);
      ctx.bezierCurveTo(150, 80, 290, 140, 360, 100);
      ctx.stroke();

      // Petit paraphe d'ornement
      ctx.beginPath();
      ctx.arc(365, 95, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
    } else {
      // Style 3 : Signature diplomatique / officielle foncée
      ctx.font = 'italic 30px "Palatino Linotype", "Book Antiqua", "Georgia", serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nameToRender, 220, 55);

      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('SIGNATURE ÉLECTRONIQUE PROBANTE', 220, 90);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 20, 380, 110);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureData(dataUrl);
    try {
      localStorage.setItem('archiveo_signature_data_' + userId, dataUrl);
    } catch {
      // ignore
    }
    toast.success(`Style calligraphique ${nextIndex + 1} appliqué et enregistré !`);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Code PIN de Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Code PIN de Sécurité de Signature
          </CardTitle>
          <CardDescription>
            Définissez votre code confidentiel personnel à 4 chiffres exigé pour valider chaque signature.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spin">Code PIN personnel (4 à 6 chiffres)</Label>
            <Input
              id="spin"
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex : 1234"
              className="text-lg font-mono tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scpin">Confirmer le Code PIN</Label>
            <Input
              id="scpin"
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Répétez votre PIN"
              className="text-lg font-mono tracking-widest"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Exiger le code PIN à chaque signature</Label>
              <p className="text-[11px] text-muted-foreground">Renforce la valeur probante de vos signatures eIDAS.</p>
            </div>
            <Switch checked={requirePin} onCheckedChange={setRequirePin} />
          </div>

          <Button onClick={handleSavePin} className="w-full">
            Enregistrer mon PIN & Signature
          </Button>
        </CardContent>
      </Card>

      {/* Signature par Défaut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-primary" /> Signature Manuscrite par Défaut
          </CardTitle>
          <CardDescription>
            Votre signature enregistrée sera automatiquement pré-remplie dans le parapheur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'draw' ? 'default' : 'outline'}
              onClick={() => setActiveTab('draw')}
              className="text-xs"
            >
              Tracer au stylet / souris
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'type' ? 'default' : 'outline'}
              onClick={() => {
                setActiveTab('type');
                generateCalligraphy();
              }}
              className="text-xs"
            >
              Générer calligraphie
            </Button>
          </div>

          {activeTab === 'draw' ? (
            <div className="space-y-2">
              <div className="border-2 border-dashed rounded-lg bg-white dark:bg-slate-950 p-1">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[130px] touch-none cursor-crosshair"
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Tracez votre signature ci-dessus</span>
                <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="text-xs h-7">
                  Effacer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {signatureData && (
                <div className="border rounded-lg p-3 bg-white flex items-center justify-center min-h-[130px]">
                  <img src={signatureData} alt="Signature" className="max-h-24 object-contain" />
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={generateCalligraphy} className="w-full text-xs">
                Régénérer le style calligraphique
              </Button>
            </div>
          )}

          {signatureData && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                Active
              </Badge>
              Signature prête pour le Parapheur Électronique
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
