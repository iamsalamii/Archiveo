'use client';

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
import { UserCircle, Lock, Bell, Globe, Monitor, History } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useI18n();

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`;

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
            <p className="text-sm text-muted-foreground">{user.function}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">{user.matricule}</Badge>
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
          <TabsTrigger value="password">Mot de passe</TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="log">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Informations personnelles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input defaultValue={user.firstName} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input defaultValue={user.lastName} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user.email} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input defaultValue={user.phone ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label>Service</Label>
                  <ParameterSelect groupCode="SERVICE" value={user.serviceId ?? ''} onValueChange={() => {}} />
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <ParameterSelect groupCode="DIRECTION" value={user.directionId ?? ''} onValueChange={() => {}} />
                </div>
              </div>
              <Button onClick={() => toast.success('Profil mis à jour')}>Enregistrer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader><CardTitle>Changer le mot de passe</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mot de passe actuel</Label>
                <Input type="password" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmer</Label>
                  <Input type="password" />
                </div>
              </div>
              <Button onClick={() => toast.success('Mot de passe modifié')}>Changer le mot de passe</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader><CardTitle>Préférences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Langue</Label>
                <div className="flex gap-2">
                  <Button variant={locale === 'fr' ? 'default' : 'outline'} size="sm" onClick={() => setLocale('fr')}>Français</Button>
                  <Button variant={locale === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLocale('en')}>English</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Thème</Label>
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
            <CardHeader><CardTitle>Sessions ouvertes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { device: 'Chrome — Windows', ip: '10.0.0.12', current: true, last: 'Maintenant' },
                { device: 'Safari — iPhone', ip: '10.0.0.45', current: false, last: 'Il y a 2h' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{s.device}</p>
                    <p className="text-xs text-muted-foreground">{s.ip} — {s.last}</p>
                  </div>
                  {s.current ? (
                    <Badge>Session actuelle</Badge>
                  ) : (
                    <Button variant="ghost" size="sm">Déconnecter</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log">
          <Card>
            <CardHeader><CardTitle>Journal d'activité</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { action: 'Connexion', date: 'Aujourd\'hui 09:12', ip: '10.0.0.12' },
                { action: 'Modification document DOC-2024-0001', date: 'Aujourd\'hui 10:30', ip: '10.0.0.12' },
                { action: 'Export PDF', date: 'Hier 14:22', ip: '10.0.0.12' },
                { action: 'Connexion', date: 'Hier 08:45', ip: '10.0.0.12' },
              ].map((entry, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{entry.action}</span>
                  <span className="text-muted-foreground ml-auto">{entry.date} • {entry.ip}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
