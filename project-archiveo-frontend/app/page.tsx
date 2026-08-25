'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { exportBrochureToPdf } from '@/utils/export';
import { useI18n } from '@/contexts/i18n-context';
import { AuthTransitionLoader } from '@/components/shared/auth-transition-loader';
import toast from 'react-hot-toast';
import {
  Archive,
  FileText,
  Search,
  Shield,
  Workflow,
  Users,
  BarChart3,
  Globe,
  Download,
  ArrowRight,
  CheckCircle2,
  Layers,
  Sparkles,
  Lock,
  Zap,
  Check,
  Building2,
  HardDrive,
  FileCheck2,
  Sliders,
  Send,
  Eye,
  ChevronRight,
  ShieldCheck,
  Database,
  QrCode,
  PenTool,
  Clock,
  Trash2,
  Calendar,
  Loader2,
} from 'lucide-react';

export default function LandingPage() {
  const { locale } = useI18n();
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [activeCycleStep, setActiveCycleStep] = useState<number>(0);
  const [previewTab, setPreviewTab] = useState<'ged' | 'archives' | 'workflows'>('ged');

  // Modal de demande de démo
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoForm, setDemoForm] = useState({
    fullName: '',
    email: '',
    company: '',
    phone: '',
    userCount: '10-50',
    needs: '',
  });

  const startTransition = (destination: string) => {
    setTransitionTarget(destination);
  };

  const downloadBrochure = () => {
    try {
      exportBrochureToPdf((locale as 'fr' | 'en') || 'fr');
    } catch (error) {
      console.error('Erreur brochure:', error);
    }
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.fullName || !demoForm.email || !demoForm.company) {
      toast.error('Veuillez renseigner les champs obligatoires (Nom, Email, Entreprise)');
      return;
    }

    setIsSubmittingDemo(true);
    setTimeout(() => {
      setIsSubmittingDemo(false);
      setIsDemoModalOpen(false);
      toast.success(
        `Merci ${demoForm.fullName} ! Votre demande de démonstration pour « ${demoForm.company} » a été transmise. Un expert Archivéo vous contactera sous 24h ouvrées.`,
        { duration: 6000 }
      );
      setDemoForm({
        fullName: '',
        email: '',
        company: '',
        phone: '',
        userCount: '10-50',
        needs: '',
      });
    }, 1000);
  };

  const cycleSteps = [
    {
      step: '01',
      title: 'Numérisation & Capture',
      desc: 'Dépôt multi-formats (PDF, Word, Scan), indexation automatique avec reconnaissance de texte OCR.',
      badge: 'Capture & OCR',
      color: 'border-blue-500 text-blue-400 bg-blue-500/10',
    },
    {
      step: '02',
      title: 'Circuits de Visa & Signature',
      desc: 'Validation multi-acteurs, notifications en temps réel et parapheur électronique à valeur probante.',
      badge: 'Parapheur Certifié',
      color: 'border-purple-500 text-purple-400 bg-purple-500/10',
    },
    {
      step: '03',
      title: 'Versement aux Archives',
      desc: 'Génération automatique des bordereaux de versement et attribution de l’emplacement topographique.',
      badge: 'Topographie & Rayonnage',
      color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
    },
    {
      step: '04',
      title: 'Gestion de la DUA',
      desc: 'Suivi strict de la Durée d’Utilité Administrative et alertes automatiques avant fin de conservation.',
      badge: 'Conformité ISO 15489',
      color: 'border-amber-500 text-amber-400 bg-amber-500/10',
    },
    {
      step: '05',
      title: 'Sort Final & Destruction',
      desc: 'Procès-verbal de destruction légale ou versement patrimonial définitif avec scellé d’intégrité.',
      badge: 'Élimination Sécurisée',
      color: 'border-red-500 text-red-400 bg-red-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Dynamic Security Transition Loader */}
      <AuthTransitionLoader
        isOpen={transitionTarget !== null}
        destination={transitionTarget || '/login'}
        onComplete={() => setTransitionTarget(null)}
      />

      {/* Modal : Formulaire de demande de démo */}
      <Dialog open={isDemoModalOpen} onOpenChange={setIsDemoModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-100 p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Calendar className="h-4 w-4" />
              </div>
              <DialogTitle className="text-xl font-bold text-white">Demander une Démonstration</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              Remplissez ce formulaire pour planifier une présentation personnalisée adaptée à vos besoins documentaires.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="demo-name" className="text-xs text-slate-300 font-medium">
                  Nom & Prénom <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="demo-name"
                  required
                  placeholder="Ex : Jean Dupont"
                  value={demoForm.fullName}
                  onChange={(e) => setDemoForm({ ...demoForm, fullName: e.target.value })}
                  className="bg-slate-950/80 border-slate-800 text-sm focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-company" className="text-xs text-slate-300 font-medium">
                  Entreprise / Organisation <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="demo-company"
                  required
                  placeholder="Ex : Ministère ou Entreprise SA"
                  value={demoForm.company}
                  onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                  className="bg-slate-950/80 border-slate-800 text-sm focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="demo-email" className="text-xs text-slate-300 font-medium">
                  Email Professionnel <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="demo-email"
                  type="email"
                  required
                  placeholder="jean.dupont@entreprise.com"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                  className="bg-slate-950/80 border-slate-800 text-sm focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-phone" className="text-xs text-slate-300 font-medium">
                  Téléphone
                </Label>
                <Input
                  id="demo-phone"
                  placeholder="+33 6 12 34 56 78"
                  value={demoForm.phone}
                  onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                  className="bg-slate-950/80 border-slate-800 text-sm focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-needs" className="text-xs text-slate-300 font-medium">
                Besoins prioritaires & Volume documentaire estimé
              </Label>
              <Textarea
                id="demo-needs"
                rows={3}
                placeholder="Ex : Numérisation du fonds d'archives, mise en place d'un parapheur électronique et archivage physique..."
                value={demoForm.needs}
                onChange={(e) => setDemoForm({ ...demoForm, needs: e.target.value })}
                className="bg-slate-950/80 border-slate-800 text-sm focus:border-blue-500 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDemoModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingDemo}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white gap-2 font-medium"
              >
                {isSubmittingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer la demande
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Aurora Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/15 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-blue-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 right-[-100px] w-[600px] h-[600px] bg-indigo-500/15 blur-[150px] rounded-full" />
      </div>

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Archive className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Archivéo
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-400">
                Enterprise GED & Archives
              </span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#cockpit" className="hover:text-blue-400 transition-colors">Aperçu Plateforme</a>
            <a href="#poles" className="hover:text-blue-400 transition-colors">Pôles Métier</a>
            <a href="#cycle" className="hover:text-blue-400 transition-colors">Cycle Documentaire</a>
            <a href="#stats" className="hover:text-blue-400 transition-colors">Chiffres Clés</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadBrochure}
              className="text-slate-300 hover:text-white hover:bg-slate-800/60 gap-2 border border-slate-800 rounded-xl"
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span className="hidden sm:inline">Brochure PDF</span>
            </Button>
            <Button
              size="sm"
              onClick={() => startTransition('/login')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 rounded-xl gap-2 font-medium px-4"
            >
              <Lock className="h-4 w-4" />
              Connexion
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 lg:pt-24 lg:pb-28 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Plateforme Unifiée de GED, Records Management & Parapheur Électronique</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
            Maîtrisez l'ensemble de votre{' '}
            <span className="block mt-2 bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              patrimoine documentaire
            </span>
            du premier scan à l'archive définitive.
          </h1>

          <p className="mx-auto max-w-3xl text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            Archivéo centralise la dématérialisation de vos documents, automatise vos flux de visa et de signatures,
            et garantit l'archivage physique et numérique selon les normes <strong>ISO 15489 & RGPD</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl gap-3 cursor-pointer"
            >
              <Calendar className="h-5 w-5" /> Demander une démo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => startTransition('/login')}
              className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl gap-3 backdrop-blur-md cursor-pointer"
            >
              <Lock className="h-5 w-5 text-blue-400" /> Espace Connexion
            </Button>
          </div>

          {/* Social Proof badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Norme ISO 15489 & RGPD</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Chiffrement fort AES-256</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 100% Paramétrable sans code</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Exports multi-formats instantanés</span>
          </div>
        </div>

        {/* Live Interactive Cockpit Preview */}
        <div id="cockpit" className="mx-auto mt-16 max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/80 p-3 lg:p-4 backdrop-blur-2xl shadow-2xl shadow-blue-950/40">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 lg:p-6 space-y-6">
            {/* Mockup Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-400 ml-2">https://app.archiveo.enterprise/dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setPreviewTab('ged')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      previewTab === 'ged' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    GED & Documents
                  </button>
                  <button
                    onClick={() => setPreviewTab('archives')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      previewTab === 'archives' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Archives & Boîtes
                  </button>
                  <button
                    onClick={() => setPreviewTab('workflows')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      previewTab === 'workflows' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Parapheur & Visa
                  </button>
                </div>
              </div>
            </div>

            {/* Mockup Live KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400">Total Documents GED</p>
                <p className="text-2xl font-bold text-white mt-1">1 248</p>
                <span className="text-[10px] text-emerald-400 font-medium">↑ +14% ce mois</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400">Archives Indexées</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">3 890</p>
                <span className="text-[10px] text-slate-400">54 boîtes de stockage</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400">Courriers Traités</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">426</p>
                <span className="text-[10px] text-blue-400">98% validés</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400">Paramètres Outils</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">56 groupes</p>
                <span className="text-[10px] text-emerald-400">100% synchronisés</span>
              </div>
            </div>

            {/* Mockup Interactive Table Data based on Tab */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-medium text-slate-300">
                <span>
                  {previewTab === 'ged' && 'Base documentaire active & versions'}
                  {previewTab === 'archives' && 'Registre topographique & récolement des archives'}
                  {previewTab === 'workflows' && 'Parapheur électronique & circuits de visa en cours'}
                </span>
                <span className="text-blue-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Actualisation temps réel
                </span>
              </div>
              <div className="divide-y divide-slate-800 text-xs">
                {previewTab === 'ged' && [
                  { ref: 'DOC-2024-0018', title: 'Contrat Cadre Prestation IT', type: 'Contrat', service: 'DSI', status: 'Validé', date: 'Aujourd’hui à 14:20' },
                  { ref: 'DOC-2024-0019', title: 'Facture Fournisseur Serveurs Cloud', type: 'Facture', service: 'Finance', status: 'En révision', date: 'Aujourd’hui à 13:10' },
                  { ref: 'DOC-2024-0020', title: 'Procédure Sécurité des Accès RGPD', type: 'Procédure', service: 'Sécurité', status: 'Validé', date: 'Hier à 17:45' },
                ].map((row, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-blue-400">{row.ref}</span>
                      <span className="font-semibold text-white">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="border-slate-700 text-slate-300">{row.type}</Badge>
                      <span className="text-slate-400 hidden sm:inline">{row.service}</span>
                      <Badge className={row.status === 'Validé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}>{row.status}</Badge>
                    </div>
                  </div>
                ))}

                {previewTab === 'archives' && [
                  { ref: 'ARCH-2024-0512', title: 'Procès-verbaux Conseil d’Administration', location: 'Bâtiment B / Rayon 4', box: 'BOX-082', status: 'Classé', date: 'DUA : 10 ans' },
                  { ref: 'ARCH-2024-0513', title: 'Dossiers du Personnel — Départs 2014', location: 'Bâtiment A / Rayon 1', box: 'BOX-014', status: 'Conservation', date: 'DUA : 50 ans' },
                  { ref: 'ARCH-2024-0514', title: 'Grand Livre Comptable Exercice 2018', location: 'Bâtiment B / Rayon 2', box: 'BOX-055', status: 'Classé', date: 'DUA : 10 ans' },
                ].map((row, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-indigo-400">{row.ref}</span>
                      <span className="font-semibold text-white">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="border-slate-700 text-slate-300 flex items-center gap-1">
                        <QrCode className="h-3 w-3 text-emerald-400" /> {row.box}
                      </Badge>
                      <span className="text-slate-400 hidden sm:inline">{row.location}</span>
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">{row.status}</Badge>
                    </div>
                  </div>
                ))}

                {previewTab === 'workflows' && [
                  { ref: 'WF-2024-0088', title: 'Approbation Bon de Commande Infrastructures', signer: 'Direction Financière', progress: 'Étape 2/3', status: 'En attente' },
                  { ref: 'WF-2024-0089', title: 'Signature Avenant Accord d’Entreprise', signer: 'Direction Générale', progress: 'Étape 3/3', status: 'Signé' },
                  { ref: 'WF-2024-0090', title: 'Validation Charte Informatique Interne', signer: 'Responsable DSI', progress: 'Étape 1/2', status: 'En cours' },
                ].map((row, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-purple-400">{row.ref}</span>
                      <span className="font-semibold text-white">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="border-slate-700 text-slate-300 flex items-center gap-1">
                        <PenTool className="h-3 w-3 text-purple-400" /> {row.signer}
                      </Badge>
                      <span className="text-slate-400 hidden sm:inline">{row.progress}</span>
                      <Badge className={row.status === 'Signé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/30'}>{row.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pôles Métier Majeurs */}
      <section id="poles" className="relative z-10 py-24 border-t border-slate-800/80 bg-slate-900/40 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30">Pôles d'Excellence</Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Une infrastructure complète pour vos archives physiques & numériques
            </h2>
            <p className="text-slate-300 text-base sm:text-lg">
              Archivéo réunit les technologies les plus exigeantes pour répondre aux enjeux des entreprises et des administrations publiques.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Pôle 1 : GED */}
            <Card className="border-slate-800 bg-slate-900/80 overflow-hidden group hover:border-blue-500/60 transition-all shadow-xl">
              <div className="p-6 bg-gradient-to-br from-blue-950/60 to-slate-950 border-b border-slate-800 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">GED & Moteur OCR</Badge>
                  <h3 className="text-xl font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">
                    1. Dématérialisation & Indexation
                  </h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Capturez tous vos flux entrants, appliquez une reconnaissance optique de caractères (OCR) sur l'intégralité du texte et organisez vos dossiers avec indexation multi-critères.
                </p>
                <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-400" /> Gestion des versions & historique infalsifiable</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-400" /> 56 groupes de métadonnées personnalisables</li>
                </ul>
              </CardContent>
            </Card>

            {/* Pôle 2 : Archivage Physique & Magasin */}
            <Card className="border-slate-800 bg-slate-900/80 overflow-hidden group hover:border-emerald-500/60 transition-all shadow-xl">
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src="/images/smart-warehouse.jpg"
                  alt="Archivage Physique & QR Code"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <Badge className="absolute top-4 left-4 bg-emerald-600 text-white border-0">Topographie & QR Codes</Badge>
              </div>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                  2. Gestion d'Entrepôt & Topographie
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Cartographiez vos magasins physiques (bâtiments, travées, étagères, boîtes d'archives). Chaque boîte possède un QR Code unique scannable pour un récolement et suivi d'inventaire parfait.
                </p>
                <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Génération et scan de QR Codes instantanés</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Registre de prêts, relances et consultations</li>
                </ul>
              </CardContent>
            </Card>

            {/* Pôle 3 : Parapheur & Sécurité */}
            <Card className="border-slate-800 bg-slate-900/80 overflow-hidden group hover:border-purple-500/60 transition-all shadow-xl">
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src="/images/digital-vault.jpg"
                  alt="Coffre-Fort & Parapheur"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <Badge className="absolute top-4 left-4 bg-purple-600 text-white border-0">Parapheur & AES-256</Badge>
              </div>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  3. Parapheur & Coffre-Fort Numérique
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Faites signer vos documents en toute conformité grâce au parapheur électronique intégré avec empreinte cryptographique SHA-256 et certificat de signature infalsifiable.
                </p>
                <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-purple-400" /> Certificat & Horodatage probant</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-purple-400" /> Journal d'audit infalsifiable de toutes les actions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Cycle de Vie Documentaire Interactif */}
      <section id="cycle" className="relative z-10 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">Cycle de Vie & DUA</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Les 5 étapes du cycle de vie documentaire
            </h2>
            <p className="text-slate-300 text-sm">
              Cliquez sur chaque étape pour visualiser la prise en charge dans Archivéo.
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {cycleSteps.map((step, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveCycleStep(idx)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeCycleStep === idx
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-mono font-bold text-blue-400 mb-1">{step.step}</div>
                <div className="text-xs font-bold text-white truncate">{step.title}</div>
              </button>
            ))}
          </div>

          {/* Active Step Details */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <Badge className={cycleSteps[activeCycleStep].color}>
                {cycleSteps[activeCycleStep].badge}
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Étape {cycleSteps[activeCycleStep].step} — {cycleSteps[activeCycleStep].title}
              </h3>
              <p className="text-slate-300 text-base leading-relaxed">
                {cycleSteps[activeCycleStep].desc}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 w-full md:w-72 space-y-3">
              <p className="text-xs font-mono text-slate-400">STATUS DU DOCUMENT</p>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-white">Conforme & Indexé</span>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3 space-y-1">
                <p>• Horodatage : <strong>Temps Réel</strong></p>
                <p>• Format : <strong>PDF/A & Scellé</strong></p>
                <p>• DUA : <strong>Règles calculées</strong></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section id="stats" className="relative z-10 py-16 border-y border-slate-800 bg-slate-900/50 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">56+</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Groupes Paramétrables</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">100%</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Traçabilité & Audit</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">6</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Formats d'Export Universels</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">&lt; 3s</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Recherche Plein Texte</p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-purple-900/60 border border-blue-500/40 p-10 sm:p-16 text-center space-y-6 backdrop-blur-2xl shadow-2xl">
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/40">Déploiement Clé en Main</Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Prêt à transformer la gestion de vos documents et archives ?
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-base sm:text-lg">
            Planifiez une démonstration personnalisée ou connectez-vous directement à votre espace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-white text-slate-950 hover:bg-slate-100 shadow-xl rounded-2xl gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Calendar className="h-5 w-5" /> Demander une démo personnalisée
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => startTransition('/login')}
              className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-slate-600 bg-slate-900/80 hover:bg-slate-800 text-white rounded-2xl cursor-pointer gap-2"
            >
              <Lock className="h-4 w-4" /> Espace Connexion
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 px-6 lg:px-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Archive className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-slate-200">Archivéo Enterprise</span>
            <span>— Plateforme GED, Records Management & Parapheur</span>
          </div>
          <p>© {new Date().getFullYear()} Archivéo. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
