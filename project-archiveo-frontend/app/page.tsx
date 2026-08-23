'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { exportBrochureToPdf } from '@/utils/export';
import { useI18n } from '@/contexts/i18n-context';
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
} from 'lucide-react';

export default function LandingPage() {
  const { locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'ged' | 'archives' | 'workflows' | 'security'>('ged');

  const downloadBrochure = () => {
    try {
      exportBrochureToPdf((locale as 'fr' | 'en') || 'fr');
    } catch (error) {
      console.error('Erreur brochure:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Aurora Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-blue-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 right-[-100px] w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
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
            <a href="#features" className="hover:text-blue-400 transition-colors">Fonctionnalités</a>
            <a href="#interactive" className="hover:text-blue-400 transition-colors">Plateforme</a>
            <a href="#security" className="hover:text-blue-400 transition-colors">Sécurité & Conformité</a>
            <a href="#stats" className="hover:text-blue-400 transition-colors">Chiffres Clés</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl">
              <Link href="/login">Connexion</Link>
            </Button>
            <Button size="sm" asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 rounded-xl gap-2 font-medium px-4">
              <Link href="/dashboard">
                Accéder <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-28 lg:pt-28 lg:pb-36 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Records Management & GED Unifiée pour Entreprise</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
            Gérez vos documents,{' '}
            <span className="block mt-2 bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              archives et courriers
            </span>
            en toute souveraineté.
          </h1>

          <p className="mx-auto max-w-3xl text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            Archivéo est la suite logicielle complète pour centraliser votre gestion électronique de documents,
            automatiser vos circuits de signature et piloter l'archivage légal selon les normes internationales.
          </p>

          <div className="flex items-center justify-center pt-4">
            <Button
              size="lg"
              asChild
              className="h-14 px-10 text-base font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl gap-3"
            >
              <Link href="/dashboard">
                Ouvrir l'application <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Social Proof badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Conformité ISO 15489 & RGPD</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Chiffrement AES-256</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 100% Paramétrable sans code</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Exports multi-formats instantanés</span>
          </div>
        </div>

        {/* Interactive App Mockup Preview */}
        <div className="mx-auto mt-16 max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/80 p-3 lg:p-4 backdrop-blur-xl shadow-2xl shadow-blue-900/20">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-4 lg:p-6 space-y-6">
            {/* Mockup Header */}
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
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">API En ligne • PostgreSQL</Badge>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">Admin Système</Badge>
              </div>
            </div>

            {/* Mockup KPIs */}
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

            {/* Mockup Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Derniers flux documentaires et versements</span>
                <span className="text-blue-400">Actualisation temps réel</span>
              </div>
              <div className="divide-y divide-slate-800 text-xs">
                {[
                  { ref: 'DOC-2024-0018', title: 'Contrat Cadre Prestation IT', type: 'Contrat', service: 'DSI', status: 'Validé', date: 'Aujourd’hui à 14:20' },
                  { ref: 'COUR-2024-0094', title: 'Notification Officielle Ministère', type: 'Courrier Entrant', service: 'Direction Générale', status: 'Enregistré', date: 'Aujourd’hui à 11:45' },
                  { ref: 'ARCH-2024-0512', title: 'Procès-verbaux Conseil d’Administration', type: 'Archive Définitive', service: 'Juridique', status: 'Classé', date: 'Hier à 16:30' },
                ].map((row, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-blue-400">{row.ref}</span>
                      <span className="font-semibold text-white">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="border-slate-700 text-slate-300">{row.type}</Badge>
                      <span className="text-slate-400 hidden sm:inline">{row.service}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{row.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-24 border-t border-slate-800/80 bg-slate-900/30 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">Modules Intégrés</Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Une solution complète pour toute l'organisation
            </h2>
            <p className="text-slate-300 text-base sm:text-lg">
              De la capture numérique à la conservation patrimoniale, chaque module est conçu pour la productivité et la rigueur.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FileText,
                title: 'Gestion Électronique de Documents (GED)',
                desc: 'Cycle de vie documentaire complet, gestion des versions, métadonnées avancées, prévisualisation et contrôle d’accès.',
                color: 'from-blue-500 to-indigo-600',
              },
              {
                icon: Archive,
                title: 'Records Management & Archivage',
                desc: 'Gestion des 3 âges des archives : courantes, intermédiaires, définitives. Bordereaux de versement, récolement et destruction légale.',
                color: 'from-indigo-500 to-purple-600',
              },
              {
                icon: Send,
                title: 'Gestion des Courriers & Expéditeurs',
                desc: 'Enregistrement des courriers entrants, sortants et internes. Gestion détaillée des expéditeurs, destinataires et signatures.',
                color: 'from-purple-500 to-pink-600',
              },
              {
                icon: Workflow,
                title: 'Workflows & Circuits de Validation',
                desc: 'Créez des circuits multi-étapes dynamiques avec notifications en temps réel, signatures électroniques et traçabilité.',
                color: 'from-emerald-500 to-teal-600',
              },
              {
                icon: Sliders,
                title: '100% Paramétrable via « Outils »',
                desc: 'Personnalisez plus de 56 groupes de paramètres : types, catégories, statuts, emplacements, directions et supports.',
                color: 'from-amber-500 to-orange-600',
              },
              {
                icon: ShieldCheck,
                title: 'Sécurité, Rôles & Journal d’Audit',
                desc: 'Contrôle d’accès granulaire basé sur les rôles (RBAC), double authentification et journalisation infalsifiable de toutes les actions.',
                color: 'from-red-500 to-rose-600',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-8 hover:border-blue-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Feature Deep Dive */}
      <section id="interactive" className="relative z-10 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8 lg:p-12 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-extrabold text-white">Pourquoi choisir Archivéo ?</h2>
              <p className="text-slate-300 text-sm mt-2">
                Conçu pour remplacer les classeurs éparpillés par une structure documentaire ultra-performante.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">01</div>
                <h4 className="text-lg font-bold text-white">Gain de temps immédiat</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Retrouvez n'importe quel document en moins de 3 secondes grâce au moteur d'indexation multicritère et aux filtres dynamiques.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">02</div>
                <h4 className="text-lg font-bold text-white">Sécurité & Conformité</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Respect strict des durées d'utilité administrative (DUA) et des règles de conservation réglementaires.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">03</div>
                <h4 className="text-lg font-bold text-white">Exports & Interopérabilité</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Générez des bordereaux et registres complets en PDF, Excel, CSV ou XML en un seul clic sur toutes les pages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section id="stats" className="relative z-10 py-16 border-y border-slate-800 bg-slate-900/40 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">56+</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Groupes Paramétrables</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">100%</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Traçabilité Audit</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">6</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Formats d'Export Intégrés</p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">&lt; 3s</p>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Temps de Recherche</p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 py-28 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-purple-900/50 border border-blue-500/30 p-10 sm:p-16 text-center space-y-6 backdrop-blur-xl shadow-2xl">
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/40">Prêt pour le déploiement</Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Modernisez votre gouvernance documentaire dès aujourd'hui
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-base sm:text-lg">
            Connectez-vous dès maintenant à votre instance Archivéo ou explorez l'application avec vos paramètres personnalisés.
          </p>
          <div className="flex items-center justify-center pt-4">
            <Button
              size="lg"
              asChild
              className="h-14 px-10 text-base font-semibold bg-white text-slate-950 hover:bg-slate-100 shadow-xl rounded-2xl gap-3 hover:scale-105 active:scale-95 transition-all"
            >
              <Link href="/dashboard">
                Accéder au Tableau de bord <ArrowRight className="h-5 w-5" />
              </Link>
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
            <span>— Plateforme GED & Records Management</span>
          </div>
          <p>© {new Date().getFullYear()} Archivéo. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
