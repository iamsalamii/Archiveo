'use client';

import { useState } from 'react';
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
import toast from 'react-hot-toast';
import {
  Archive,
  FileText,
  Search,
  Shield,
  Workflow,
  Download,
  ArrowRight,
  CheckCircle2,
  Lock,
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
  Layers,
  Fingerprint,
  Scale,
  Server,
  FileSpreadsheet,
  Check,
  Award,
} from 'lucide-react';

export default function LandingPage() {
  const { locale } = useI18n();

  // États de navigation documentaire interactive
  const [activeTab, setActiveTab] = useState<'content' | 'audit' | 'workflow' | 'physical'>('content');
  const [activeCycleAge, setActiveCycleAge] = useState<number>(0);

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
      toast.error('Veuillez renseigner les champs obligatoires (Nom, Email, Organisation)');
      return;
    }

    setIsSubmittingDemo(true);
    setTimeout(() => {
      setIsSubmittingDemo(false);
      setIsDemoModalOpen(false);
      toast.success(
        `Merci ${demoForm.fullName}. Votre demande institutionnelle pour « ${demoForm.company} » a été prise en compte. Un conseiller vous contactera sous 24h ouvrées.`,
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
    }, 600);
  };

  // Données des 3 âges de l'archivage
  const cycleStages = [
    {
      stage: 'Premier Âge',
      name: 'Archives Courantes & GED Active',
      duration: 'Utilisation permanente (1 à 3 ans)',
      role: 'Directions métiers, services opérationnels',
      description: 'Documents d’usage quotidien créés ou reçus par les équipes. Traitement collaboratif, indexation plein texte OCR, gestion stricte des versions et validation par parapheur.',
      icon: FileText,
      storage: 'Stockage rapide chiffré NVMe (accès temps réel)',
      legal: 'Valeur administrative immédiate',
    },
    {
      stage: 'Deuxième Âge',
      name: 'Archives Intermédiaires (DUA)',
      duration: 'Durée d’Utilité Administrative (3 à 10 ans)',
      role: 'Responsables juridiques, conformité et records managers',
      description: 'Les documents ne sont plus consultés quotidiennement mais doivent être conservés pour des impératifs légaux, fiscaux, contractuels ou contentieux. Intégrité scellée par hachage SHA-256.',
      icon: Scale,
      storage: 'Coffre-fort électronique sécurisé & magasins physiques',
      legal: 'Valeur probatoire et justificative stricte',
    },
    {
      stage: 'Troisième Âge',
      name: 'Sort Final Réglementé',
      duration: 'Conservation perpétuelle ou élimination certifiée',
      role: 'Chefs archivistes & Direction Générale',
      description: 'À l’issue de la DUA, le système applique les règles de tri : soit la destruction sécurisée avec émission d’un procès-verbal d’élimination, soit le versement aux archives historiques définitives.',
      icon: Award,
      storage: 'Magasins climatisés géoréférencés ou destruction contrôlée',
      legal: 'Bordereau légal de versement ou PV d’élimination',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* 1. BARRE DE NAVIGATION INSTITUTIONNELLE */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo officiel */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Archive className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                ARCHIVÉO
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Gouvernance & Records Management
              </span>
            </div>
          </Link>

          {/* Actions & Navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadBrochure}
              className="hidden sm:inline-flex border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white gap-2 text-xs font-medium"
            >
              <Download className="h-3.5 w-3.5 text-blue-400" />
              Spécifications PDF
            </Button>

            <Link href="/login">
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 gap-2 shadow-sm"
              >
                <Lock className="h-3.5 w-3.5" />
                Portail Authentifié
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. SECTION HERO ÉDITORIALE */}
      <section className="relative border-b border-slate-800 py-20 lg:py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            {/* Norme de conformité */}
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-mono text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>SYSTÈME SOUVERAIN CONFORME ISO 15489 & RGPD</span>
            </div>

            {/* Titre d'autorité */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
              L’infrastructure de gouvernance documentaire et de records management.
            </h1>

            {/* Sous-titre institutionnel */}
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-sans max-w-2xl">
              Archivéo unifie la GED collaborative, le circuit de signature électronique et l’archivage physique en magasin. Une plateforme hermétique pour institutions, banques et entreprises exigeant intégrité juridique et maîtrise absolue de leurs données.
            </p>

            {/* Actions principales */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                onClick={() => setIsDemoModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 text-sm rounded-md shadow-sm gap-2"
              >
                <Calendar className="h-4 w-4" />
                Demander une démonstration institutionnelle
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={downloadBrochure}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white px-6 py-3 text-sm rounded-md gap-2"
              >
                <FileText className="h-4 w-4 text-slate-400" />
                Dossier technique d’architecture
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LE THÉÂTRE DOCUMENTAIRE (DOCUMENT STAGE) */}
      <section className="py-20 border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
                L’EXPÉRIENCE DU DOCUMENT RÉEL
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-2">
                Traçabilité, authenticité et scellement probatoire.
              </h2>
            </div>
            <p className="text-sm text-slate-400 max-w-md">
              Chaque pièce documentaire archivée dans Archivéo constitue une unité probatoire indivisible : métadonnées certifiées, journal des accès horodaté et localisation physique rigoureuse.
            </p>
          </div>

          {/* Interface interactive de visualisation documentaire */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
            {/* Barre de commande du document */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-blue-400 font-mono text-xs font-bold">
                  PDF
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white">DOC-2025-001</span>
                    <span className="rounded bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                      SCELLÉ SHA-256
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Convention quadriennale d’audit financier et commissariat aux comptes (Deloitte & Associés)
                  </p>
                </div>
              </div>

              {/* Onglets de consultation */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'content'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Document & Métadonnées
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'audit'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Piste d’Audit Légale
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('workflow')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'workflow'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Circuit & Visas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('physical')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'physical'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Conservation Physique
                </button>
              </div>
            </div>

            {/* Corps du visualiseur documentaire */}
            <div className="p-6 lg:p-8 min-h-[420px]">
              {activeTab === 'content' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Fiche éditoriale du document */}
                  <div className="lg:col-span-8 rounded-lg border border-slate-800 bg-slate-950 p-6 space-y-6">
                    <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                      <div>
                        <span className="text-[11px] font-mono text-slate-500 uppercase">RÉFÉRENTIEL CONTRAT</span>
                        <h3 className="font-serif text-xl font-bold text-white mt-1">
                          Convention d’Audit Financier et Commissariat aux Comptes 2025-2027
                        </h3>
                      </div>
                      <span className="font-mono text-xs text-blue-400 border border-blue-900 bg-blue-950/40 px-2.5 py-1 rounded">
                        CONFIDENTIEL
                      </span>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
                      <p>
                        <strong>Objet du contrat :</strong> Mission d’audit contractuel, vérification de sincérité des états financiers annuels consolidés et certification légale selon les normes professionnelles de la Compagnie Nationale des Commissaires aux Comptes.
                      </p>
                      <p>
                        <strong>Engagements d’intégrité :</strong> Les rapports certifiés originaux et leurs annexes probantes sont déposés au coffre-fort électronique sous empreinte cryptographique SHA-256 avec archivage probatoire des procès-verbaux de séance.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500 font-mono text-[10px] block">SERVICE ÉMETTEUR</span>
                        <span className="font-semibold text-slate-200">Direction Juridique</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-mono text-[10px] block">DURÉE DE CONSERVATION</span>
                        <span className="font-semibold text-slate-200">10 ans (DUA Fiscale)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-mono text-[10px] block">FORMAT D’ARCHIVE</span>
                        <span className="font-semibold text-slate-200">PDF/A-1b (ISO 19005)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-mono text-[10px] block">POIDS NUMÉRIQUE</span>
                        <span className="font-semibold text-slate-200">2.45 Mo (Scellé)</span>
                      </div>
                    </div>
                  </div>

                  {/* Empreinte et Certificat d'Intégrité */}
                  <div className="lg:col-span-4 rounded-lg border border-slate-800 bg-slate-950 p-6 space-y-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-white">
                        <Fingerprint className="h-4 w-4 text-emerald-400" />
                        CERTIFICAT D’INTÉGRITÉ
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Le document a été contrôlé sans altération depuis son enregistrement le 12 Janvier 2025.
                      </p>

                      <div className="mt-4 rounded border border-slate-800 bg-slate-900 p-3 font-mono text-[10px] text-slate-300 break-all">
                        <span className="text-slate-500 block">SHA-256 HASH :</span>
                        e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Horodatage RFC 3161 :</span>
                        <span className="font-mono text-slate-200">12/01/2025 09:41:22 UTC</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Contrôle de conformité :</span>
                        <span className="font-semibold text-emerald-400">Certifié ISO 15489</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-6">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
                    JOURNAL D’AUDIT INFALSIFIABLE (REGISTRE DES TRANSACTIONS)
                  </h4>
                  <div className="divide-y divide-slate-800 text-xs">
                    {[
                      { date: '12/01/2025 09:41:22', user: 'Sophie Laurent (Juridique)', action: 'Création & Versement initial du contrat', ip: '192.168.1.45', status: '201 Validé' },
                      { date: '12/01/2025 11:15:04', user: 'Mamadou Diallo (DSI)', action: 'Contrôle antivirus et calcul empreinte SHA-256', ip: '192.168.1.12', status: '200 Scellé' },
                      { date: '15/01/2025 14:30:00', user: 'Claire Dubois (DG)', action: 'Apposition du visa électronique officiel', ip: '192.168.1.2', status: '200 Visé' },
                      { date: '20/01/2025 16:02:18', user: 'Amadou Traoré (Archiviste)', action: 'Attribution de la cote physique Magasin 3 / Travée 12', ip: '192.168.1.80', status: '200 Coté' },
                      { date: '04/02/2025 10:20:11', user: 'Pierre Leroy (DAF)', action: 'Consultation sécurisée pour audit préparatoire', ip: '192.168.1.33', status: '200 Lu' },
                    ].map((entry, idx) => (
                      <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-500 text-[11px] w-36 shrink-0">{entry.date}</span>
                          <div>
                            <span className="font-semibold text-slate-200">{entry.user}</span>
                            <span className="text-slate-400 block sm:inline sm:ml-2">— {entry.action}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-mono shrink-0">
                          <span className="text-slate-500">{entry.ip}</span>
                          <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded">
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'workflow' && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 space-y-6">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400">
                    CIRCUIT DE VALIDATION & VISA HIÉRARCHIQUE
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { step: 'Étape 1', role: 'Responsable Juridique', name: 'Sophie Laurent', status: 'Approuvé', date: '12/01/2025', note: 'Conforme aux exigences statutaires et légales.' },
                      { step: 'Étape 2', role: 'Direction Financière', name: 'Pierre Leroy', status: 'Approuvé', date: '13/01/2025', note: 'Engagements budgétaires validés pour l’exercice 2025.' },
                      { step: 'Étape 3', role: 'Directrice Générale', name: 'Claire Dubois', status: 'Signé', date: '15/01/2025', note: 'Paraphe électronique officiel scellé.' },
                    ].map((w, idx) => (
                      <div key={idx} className="rounded border border-slate-800 bg-slate-900 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-blue-400 uppercase">{w.step}</span>
                          <span className="rounded bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> {w.status}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{w.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{w.role}</p>
                        </div>
                        <p className="text-xs text-slate-300 italic pt-2 border-t border-slate-800">
                          « {w.note} »
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'physical' && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400">
                        TOPOGRAPHIE & GÉOLOCALISATION DU CONTENANT PHYSIQUE
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Pour les documents matériels, Archivéo assure la correspondance stricte entre le dossier numérique et l’archive physique en magasin.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-blue-400 bg-blue-950/40 border border-blue-900 px-3 py-1.5 rounded">
                      <QrCode className="h-4 w-4" />
                      COTE : B3-T12-C-042
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                    <div className="rounded border border-slate-800 bg-slate-900 p-3">
                      <span className="text-slate-500 block text-[10px]">BÂTIMENT</span>
                      <span className="font-bold text-white text-sm">Siège Central</span>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900 p-3">
                      <span className="text-slate-500 block text-[10px]">MAGASIN</span>
                      <span className="font-bold text-white text-sm">Magasin 03</span>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900 p-3">
                      <span className="text-slate-500 block text-[10px]">TRAVÉE</span>
                      <span className="font-bold text-white text-sm">Travée 12</span>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900 p-3">
                      <span className="text-slate-500 block text-[10px]">TABLETTE</span>
                      <span className="font-bold text-white text-sm">Niveau C</span>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900 p-3">
                      <span className="text-slate-500 block text-[10px]">BOÎTE ARCHIVE</span>
                      <span className="font-bold text-blue-400 text-sm">Boîte B-042</span>
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 space-y-1">
                    <p>
                      <strong>Contrôle physique des mouvements :</strong> Chaque emprunt ou consultation d’original physique donne lieu à l’émission d’un bordereau de prêt (fantôme d’archive) avec date limite de restitution et notification automatique.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. LES 4 PILIERS FONCTIONNELS DE LA SOLUTION */}
      <section className="py-20 border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
              ARCHITECTURE FONCTIONNELLE
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-2">
              Les quatre piliers de la gouvernance Archivéo.
            </h2>
            <p className="text-sm text-slate-400 mt-3">
              Un système intégré conçu selon les exigences du Records Management international, évitant le morcellement des outils entre classement, signature et conservation légale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pilier 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 border border-blue-800 text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">
                GED Native & Recherche OCR
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recherche plein texte dans le contenu des documents numérisés, gestion stricte des versions, métadonnées normalisées et visionneuse in-app sécurisée sans fuite de cache.
              </p>
              <ul className="text-[11px] font-mono text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
                <li>• Formats PDF/A, TIFF, DOCX, EML</li>
                <li>• Moteur OCR plein texte</li>
                <li>• Historique des versions immuable</li>
              </ul>
            </div>

            {/* Pilier 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 border border-blue-800 text-blue-400">
                <Archive className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">
                Records Management & DUA
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Application des Durées d’Utilité Administrative (DUA), gestion topographique des magasins physiques par QR code, bordereaux de versement et élimination réglementaire.
              </p>
              <ul className="text-[11px] font-mono text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
                <li>• Norme internationale ISO 15489</li>
                <li>• Fantômes de prêts physiques</li>
                <li>• Procès-verbaux de destruction légaux</li>
              </ul>
            </div>

            {/* Pilier 3 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 border border-blue-800 text-blue-400">
                <PenTool className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">
                Parapheur & Visa Électronique
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Circuits de décision hiérarchiques séquentiels ou parallèles, paraphe sécurisé avec code PIN de signature, notifications d’échéances et scellé d’intégrité infalsifiable.
              </p>
              <ul className="text-[11px] font-mono text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
                <li>• Circuits personnalisés multi-étapes</li>
                <li>• Visa horodaté avec certificat</li>
                <li>• Alertes d’échéance automatiques</li>
              </ul>
            </div>

            {/* Pilier 4 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 border border-blue-800 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">
                Sécurité & Piste d’Audit
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Contrôle d’accès granulaire basé sur les rôles (RBAC matriciel), journalisation exhaustive des opérations, conformité RGPD et hermétisme de l’instance dédiée.
              </p>
              <ul className="text-[11px] font-mono text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
                <li>• 57 permissions granulaires</li>
                <li>• Journal d’audit non altérable</li>
                <li>• Instance et base de données isolées</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LE CYCLE ARCHIVISTIQUE DES 3 ÂGES */}
      <section className="py-20 border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
              MÉTHODOLOGIE ARCHIVISTIQUE
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-2">
              Le cycle de vie documentaire des 3 âges.
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              De la création du dossier jusqu’à sa conservation perpétuelle ou sa destruction certifiée, chaque document suit une trajectoire juridique maîtrisée.
            </p>
          </div>

          {/* Sélecteur d'âge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {cycleStages.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = activeCycleAge === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveCycleAge(idx)}
                  className={`text-left rounded-lg p-5 border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-slate-900 shadow-md ring-1 ring-blue-500'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] text-blue-400 uppercase font-semibold">
                      {stage.stage}
                    </span>
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                  </div>
                  <h4 className="font-serif font-bold text-white text-base">
                    {stage.name}
                  </h4>
                  <p className="font-mono text-xs text-slate-400 mt-1">
                    {stage.duration}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Détail du stade actif */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <span className="font-mono text-xs uppercase text-slate-500">
                  RESPONSABILITÉ MÉTIER : {cycleStages[activeCycleAge].role}
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">
                  {cycleStages[activeCycleAge].name}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {cycleStages[activeCycleAge].description}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 space-y-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">INFRASTRUCTURE DE STOCKAGE</span>
                  <span className="text-white font-medium">{cycleStages[activeCycleAge].storage}</span>
                </div>
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-slate-500 block text-[10px]">VALEUR LÉGALE & NORMATIVE</span>
                  <span className="text-blue-400 font-semibold">{cycleStages[activeCycleAge].legal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SPÉCIFICATIONS TECHNIQUES SOUVERAINES (POUR DSI & DIRECTION) */}
      <section className="py-20 border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
              INFRASTRUCTURE & DÉPLOIEMENT DÉDIÉ
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-2">
              Une technologie pérenne, souveraine et certifiée.
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Archivéo est déployé sous forme d’instance isolée pour chaque client : aucune mutualisation de base de données, aucun risque de fuite de données inter-entreprises.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-2">
              <Server className="h-5 w-5 text-blue-400" />
              <p className="font-bold text-white text-sm">Hébergement Dédié</p>
              <p className="text-slate-400 leading-relaxed font-sans">
                Au choix : serveurs sur site (On-Premise) du client ou Cloud souverain isolé (OVHcloud, Hetzner, SecNumCloud).
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-2">
              <Database className="h-5 w-5 text-blue-400" />
              <p className="font-bold text-white text-sm">Base PostgreSQL Dédiée</p>
              <p className="text-slate-400 leading-relaxed font-sans">
                Chaque organisation possède son schéma et sa base hermétique. Sauvegardes automatisées chiffrées quotidiennes.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-2">
              <Lock className="h-5 w-5 text-blue-400" />
              <p className="font-bold text-white text-sm">Chiffrement de Bout en Bout</p>
              <p className="text-slate-400 leading-relaxed font-sans">
                Transmissions chiffrées TLS 1.3 avec certificats SSL Let's Encrypt et hachage d’intégrité SHA-256 permanent.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-2">
              <HardDrive className="h-5 w-5 text-blue-400" />
              <p className="font-bold text-white text-sm">Conteneurisation Docker</p>
              <p className="text-slate-400 leading-relaxed font-sans">
                Déploiement reproductible et migration fluide sans dépendance d’environnement grâce à Docker Compose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. APPEL À L'ACTION INSTITUTIONNEL (CTA) */}
      <section className="py-20 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-6">
            <span className="font-mono text-xs text-blue-400 uppercase tracking-widest">
              DÉMARREZ LA TRANSFORMATION DOCUMENTAIRE
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white max-w-2xl mx-auto leading-tight">
              Prenez le contrôle souverain de vos archives et de votre gouvernance documentaire.
            </h2>

            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Consultez notre équipe d’ingénieurs et d’archivistes professionnels pour calibrer votre projet selon vos volumétries et contraintes légales.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => setIsDemoModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-3 rounded-md gap-2"
              >
                <Calendar className="h-4 w-4" />
                Demander une démonstration institutionnelle
              </Button>

              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-sm font-medium px-6 py-3 rounded-md gap-2"
                >
                  <Lock className="h-4 w-4 text-blue-400" />
                  Connexion au portail
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER INSTITUTIONNEL */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
              <Archive className="h-4 w-4" />
            </div>
            <div>
              <p className="font-serif font-bold text-white text-sm">ARCHIVÉO ENTERPRISE</p>
              <p className="text-[11px] font-mono text-slate-400">Système de GED & Records Management Souverain</p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>Conforme ISO 15489</span>
            <span>Sécurisé RGPD</span>
            <span>Scellé SHA-256</span>
          </div>

          <p className="text-[11px]">
            © {new Date().getFullYear()} Archivéo. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* MODAL INSTITUTIONNELLE DE DEMANDE DE DÉMO */}
      <Dialog open={isDemoModalOpen} onOpenChange={setIsDemoModalOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-blue-400 mb-1">
              <Calendar className="h-4 w-4" />
              DEMANDE DE DÉMONSTRATION INSTITUTIONNELLE
            </div>
            <DialogTitle className="font-serif text-2xl font-bold text-white">
              Planifier une session de présentation personnalisée
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Nos spécialistes vous présenteront l’environnement Archivéo paramétré selon les processus métier de votre organisation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDemoSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="demo-name" className="text-xs text-slate-300">
                  Nom & Prénom <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="demo-name"
                  placeholder="Jean Dupont"
                  value={demoForm.fullName}
                  onChange={(e) => setDemoForm({ ...demoForm, fullName: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-company" className="text-xs text-slate-300">
                  Organisation / Entreprise <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="demo-company"
                  placeholder="Ministère, Banque, ETI..."
                  value={demoForm.company}
                  onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="demo-email" className="text-xs text-slate-300">
                  Email Professionnel <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="demo-email"
                  type="email"
                  placeholder="j.dupont@organisation.fr"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-phone" className="text-xs text-slate-300">
                  Téléphone
                </Label>
                <Input
                  id="demo-phone"
                  placeholder="+33 1 23 45 67 89"
                  value={demoForm.phone}
                  onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-count" className="text-xs text-slate-300">
                Périmètre d'utilisateurs estimé
              </Label>
              <select
                id="demo-count"
                value={demoForm.userCount}
                onChange={(e) => setDemoForm({ ...demoForm, userCount: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="1-10">1 à 10 utilisateurs (Équipe restreinte)</option>
                <option value="10-50">10 à 50 utilisateurs (Direction / PME)</option>
                <option value="50-250">50 à 250 utilisateurs (ETI / Pôle)</option>
                <option value="250+">Plus de 250 utilisateurs (Institution / Groupe)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-needs" className="text-xs text-slate-300">
                Besoins prioritaires & Volumétrie
              </Label>
              <Textarea
                id="demo-needs"
                placeholder="Ex : Numérisation de dossiers RH, gestion des magasins d'archives physiques, parapheur de visa pour la direction..."
                value={demoForm.needs}
                onChange={(e) => setDemoForm({ ...demoForm, needs: e.target.value })}
                className="bg-slate-950 border-slate-800 text-white text-xs min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDemoModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingDemo}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 gap-2"
              >
                {isSubmittingDemo ? (
                  <span>Transmission en cours...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Transmettre la demande
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
