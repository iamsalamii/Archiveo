'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ParameterSelect } from '@/components/shared/parameter-select';
import { useTheme } from '@/contexts/theme-context';
import { api } from '@/services/api';
import { toast } from 'sonner';
import type { OrganizationSettings, AppSettings } from '@/types';
import { Settings, Building, Palette, SlidersHorizontal } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [app, setApp] = useState<AppSettings | null>(null);

  useEffect(() => {
    Promise.all([api.getOrganizationSettings(), api.getAppSettings()]).then(([o, a]) => {
      setOrg(o);
      setApp(a);
    });
  }, []);

  const saveOrg = async () => {
    if (!org) return;
    await api.saveOrganizationSettings(org);
    toast.success('Paramètres organisation enregistrés');
  };

  const saveApp = async () => {
    if (!app) return;
    await api.saveAppSettings(app);
    toast.success('Paramètres application enregistrés');
  };

  if (!org || !app) return <div className="h-96 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Configuration générale de l'organisation et de l'application"
        icon={<Settings className="h-6 w-6" />}
        exportData={[
          { Categorie: 'Organisation', Parametre: 'Nom', Valeur: org.name },
          { Categorie: 'Organisation', Parametre: 'Email', Valeur: org.email },
          { Categorie: 'Organisation', Parametre: 'Téléphone', Valeur: org.phone },
          { Categorie: 'Organisation', Parametre: 'Adresse', Valeur: org.address },
          { Categorie: 'Application', Parametre: 'Nom Application', Valeur: app.appName },
          { Categorie: 'Application', Parametre: 'Version', Valeur: app.version },
        ]}
        exportColumns={[
          { key: 'Categorie', label: 'Catégorie' },
          { key: 'Parametre', label: 'Paramètre' },
          { key: 'Valeur', label: 'Valeur configurée' },
        ]}
        exportFilename="configuration-archiveo"
        exportTitle="Configuration Système Archivéo"
      />

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organisation</TabsTrigger>
          <TabsTrigger value="app">Application</TabsTrigger>
          <TabsTrigger value="theme">Thème</TabsTrigger>
          <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Paramètres organisation</CardTitle>
              <CardDescription>Informations de votre organisation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Nom</Label><Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Téléphone</Label><Input value={org.phone} onChange={(e) => setOrg({ ...org, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Site Web</Label><Input value={org.website ?? ''} onChange={(e) => setOrg({ ...org, website: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Adresse</Label><Input value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Pays</Label><ParameterSelect groupCode="COUNTRY" value={org.country} onValueChange={(v) => setOrg({ ...org, country: v })} /></div>
                <div className="space-y-2"><Label>Langue par défaut</Label><ParameterSelect groupCode="LANGUAGE" value={org.defaultLanguage} onValueChange={(v) => setOrg({ ...org, defaultLanguage: v })} /></div>
                <div className="space-y-2"><Label>Fuseau horaire</Label><Input value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Devise</Label><Input value={org.currency} onChange={(e) => setOrg({ ...org, currency: e.target.value })} /></div>
                <div className="space-y-2"><Label>Format de date</Label><Input value={org.dateFormat} onChange={(e) => setOrg({ ...org, dateFormat: e.target.value })} /></div>
                <div className="space-y-2"><Label>Format d'heure</Label><Input value={org.timeFormat} onChange={(e) => setOrg({ ...org, timeFormat: e.target.value })} /></div>
              </div>
              <Button onClick={saveOrg}>Enregistrer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /> Paramètres application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Nom de l'application</Label><Input value={app.appName} onChange={(e) => setApp({ ...app, appName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Version</Label><Input value={app.version} disabled /></div>
                <div className="space-y-2"><Label>Typographie</Label><Input value={app.typography} onChange={(e) => setApp({ ...app, typography: e.target.value })} /></div>
                <div className="space-y-2"><Label>Couleur principale</Label><Input value={app.primaryColor} onChange={(e) => setApp({ ...app, primaryColor: e.target.value })} /></div>
              </div>
              <Button onClick={saveApp}>Enregistrer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Thème</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mode d'affichage</Label>
                <div className="flex gap-2">
                  {([
                    { val: 'light' as const, label: 'Clair' },
                    { val: 'dark' as const, label: 'Sombre' },
                    { val: 'system' as const, label: 'Système' },
                  ]).map((opt) => (
                    <Button key={opt.val} variant={theme === opt.val ? 'default' : 'outline'} onClick={() => setTheme(opt.val)}>
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Animations</span>
                <Switch defaultChecked={app.animationsEnabled} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Sidebar étendue</span>
                <Switch defaultChecked={app.expandedSidebar} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Mode compact</span>
                <Switch defaultChecked={app.compactMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader><CardTitle>Fonctionnalités</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'OCR automatique', desc: 'Reconnaissance de texte sur les documents scannés' },
                { label: 'Résumé IA', desc: 'Génération automatique de résumés' },
                { label: 'Classification IA', desc: 'Classification automatique des documents' },
                { label: 'Notifications temps réel', desc: 'Push des notifications en temps réel' },
                { label: 'Workflow automatique', desc: 'Déclenchement automatique des workflows' },
                { label: 'Recherche sémantique', desc: 'Recherche par signification, non par mot-clé' },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  <Switch defaultChecked={Math.random() > 0.5} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
