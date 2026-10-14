'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Lock,
  ArrowRight,
  Shield,
  CheckCircle2,
  Scan,
  Eye,
  QrCode,
  Building,
  Clock,
  Key,
  FolderCheck,
  Check,
  X,
  Calendar,
  Send,
  Archive,
  Menu,
  Download,
  Fingerprint,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'meta' | 'audit' | 'visa' | 'phys'>('meta');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [demoForm, setDemoForm] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: '',
    projectScope: 'Plateforme Hybride : Entrepôts Physiques + Numérique WORM',
    userCount: '10-50',
    needs: '',
  });

  // Initialisation dynamique Three.js pour la scène du Coffre-Fort 3D
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let cleanupThree: (() => void) | null = null;

    const initThree = () => {
      // @ts-ignore
      const THREE = window.THREE;
      if (!THREE || !canvasRef.current) return;
      const container = canvasRef.current;
      const width = container.clientWidth || 450;
      const height = container.clientHeight || 420;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 7.5);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Lumières
      const ambientLight = new THREE.AmbientLight(0x93c5fd, 0.85);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0x38bdf8, 2.8, 50);
      pointLight.position.set(5, 6, 8);
      scene.add(pointLight);

      const backLight = new THREE.PointLight(0x6366f1, 2.2, 50);
      backLight.position.set(-6, -4, -5);
      scene.add(backLight);

      // Groupe du Coffre Souverain
      const vaultGroup = new THREE.Group();
      scene.add(vaultGroup);

      // Cube principal WORM
      const cubeGeo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
      const cubeMat = new THREE.MeshStandardMaterial({
        color: 0x0a1630,
        metalness: 0.85,
        roughness: 0.2,
        transparent: true,
        opacity: 0.88,
      });
      const mainVault = new THREE.Mesh(cubeGeo, cubeMat);
      vaultGroup.add(mainVault);

      // Arêtes lumineuses wireframe
      const edges = new THREE.EdgesGeometry(cubeGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.85,
      });
      const wireCube = new THREE.LineSegments(edges, lineMat);
      vaultGroup.add(wireCube);

      // Anneaux orbitaux
      const ringGeo1 = new THREE.TorusGeometry(2.1, 0.025, 16, 100);
      const ringMat1 = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        metalness: 0.9,
        roughness: 0.1,
      });
      const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      ring1.rotation.x = Math.PI / 3;
      vaultGroup.add(ring1);

      const ringGeo2 = new THREE.TorusGeometry(2.4, 0.02, 16, 100);
      const ringMat2 = new THREE.MeshStandardMaterial({
        color: 0x818cf8,
        emissive: 0x4f46e5,
        metalness: 0.9,
        roughness: 0.1,
      });
      const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      ring2.rotation.y = Math.PI / 4;
      ring2.rotation.z = Math.PI / 6;
      vaultGroup.add(ring2);

      // Noyau d'intégrité SHA-256
      const coreGeo = new THREE.OctahedronGeometry(0.85, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x1d4ed8,
        wireframe: true,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      vaultGroup.add(core);

      // Particules de registre
      const particleCount = 180;
      const particlesGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 8.5;
        positions[i + 1] = (Math.random() - 0.5) * 8.5;
        positions[i + 2] = (Math.random() - 0.5) * 8.5;
      }
      particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particlesMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.05,
        transparent: true,
        opacity: 0.75,
      });
      const particleSystem = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particleSystem);

      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;

      const onMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      };

      container.addEventListener('mousemove', onMouseMove);

      const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      };

      window.addEventListener('resize', onResize);

      let animId: number;
      const animate = () => {
        animId = requestAnimationFrame(animate);

        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        vaultGroup.rotation.y += 0.007;
        vaultGroup.rotation.x += 0.004;

        vaultGroup.rotation.y += targetX * 0.02;
        vaultGroup.rotation.x -= targetY * 0.02;

        ring1.rotation.z += 0.012;
        ring2.rotation.x -= 0.008;

        core.rotation.y -= 0.02;
        core.rotation.z += 0.015;

        particleSystem.rotation.y -= 0.0015;

        renderer.render(scene, camera);
      };
      animate();

      cleanupThree = () => {
        cancelAnimationFrame(animId);
        container.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
      };
    };

    // @ts-ignore
    if (window.THREE) {
      initThree();
    } else {
      script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = () => initThree();
      document.head.appendChild(script);
    }

    return () => {
      if (cleanupThree) cleanupThree();
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDemo(true);
    setTimeout(() => {
      setIsSubmittingDemo(false);
      setDemoSuccess(true);
    }, 900);
  };

  const downloadBrochure = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(7, 12, 24);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('ARCHIVÉO ENTERPRISE', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(147, 197, 253);
      doc.text('PLATEFORME SOUVERAINE DE RECORDS MANAGEMENT & GED LÉGALE', 14, 30);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text('Spécifications Techniques & Cadre d’Autorité ISO 15489', 14, 52);

      autoTable(doc, {
        startY: 60,
        head: [['Pôle Fonctionnel', 'Norme & Exigence', 'Garantie Technique Archivéo']],
        body: [
          ['GED & Numérisation', 'NF Z42-026 / ISO 19005', 'PDF/A-1b, indexation plein texte OCR, métadonnées Dublin Core'],
          ['Parapheur Électronique', 'eIDAS (UE) 910/2014', 'Circuits hiérarchiques, certificats X.509 et jeton d’autorité'],
          ['Records Management', 'ISO 15489-1:2016', 'Cycle des 3 âges, gestion rigoureuse des DUA et bordereaux SEDA'],
          ['Gestion Topographique', 'Magasins Physiques', 'Géoréférencement 3D (Bâtiment, Travée, Boîte QR Code, Prêts)'],
          ['Sécurité & Souveraineté', 'SecNumCloud / RGS***', 'Enclave souveraine On-Premise / Bare Metal, scellement SHA-256'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [29, 78, 216], textColor: 255 },
      });

      doc.save('Archiveo-Enterprise-Dossier-Technique.pdf');
    } catch (err) {
      console.error('Erreur génération brochure:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] font-sans text-[#e2e8f8] selection:bg-blue-600 selection:text-white">
      {/* 1. HEADER ÉPURÉ INSTITUTIONNEL SANS VOYANT NI AVATAR */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#070c18]/85 backdrop-blur-xl border-b border-white/[0.08] transition-all duration-300">
        <div className="max-w-7xl mx-auto h-20 px-6 sm:px-8 flex items-center justify-between gap-6">
          {/* Logo vectoriel boîte d'archives d'autorité */}
          <Link href="/" className="flex items-center gap-3.5 group text-decoration-none shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-700/40 via-[#131a2e] to-[#050813] border border-blue-400/40 flex items-center justify-center p-2 shadow-[0_0_20px_rgba(37,99,235,0.25)] group-hover:border-blue-400 group-hover:shadow-[0_0_25px_rgba(147,197,253,0.4)] transition-all duration-300">
              <svg
                className="w-full h-full text-blue-300"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M2.5 5.5h19v3.5h-19z" />
                <path d="M4.5 9v10.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V9" />
                <rect height="3" rx="0.8" strokeWidth="1.4" width="6" x="9" y="12.5" />
                <line strokeDasharray="2 2" strokeWidth="1" x1="2.5" x2="21.5" y1="7" y2="7" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg tracking-wider text-white uppercase font-bold leading-none">
                ARCHIVÉO
              </span>
              <span className="font-mono text-[10px] tracking-[0.25em] text-blue-300/80 uppercase mt-1">
                ENTERPRISE
              </span>
            </div>
          </Link>

          {/* Navigation principale sur une seule ligne continue */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium whitespace-nowrap">
            <a href="#piliers-metier" className="text-slate-300 hover:text-white transition-colors duration-200">
              Piliers Métier
            </a>
            <a href="#theatre-documentaire" className="text-slate-300 hover:text-white transition-colors duration-200">
              Cockpit Documentaire
            </a>
            <a href="#cycle-de-vie-dua" className="text-slate-300 hover:text-white transition-colors duration-200">
              Cycle de Vie
            </a>
            <a href="#infrastructures" className="text-slate-300 hover:text-white transition-colors duration-200">
              Magasins &amp; Coffres
            </a>
            <a href="#cadre-securite" className="text-slate-300 hover:text-white transition-colors duration-200">
              Sécurité &amp; Audit
            </a>
          </nav>

          {/* Actions Header */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.12] rounded-lg transition-all duration-200 whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5 text-blue-300" />
              <span>Connexion Sécurisée</span>
            </Link>
            <button
              onClick={() => {
                setDemoSuccess(false);
                setIsDemoModalOpen(true);
              }}
              className="relative group overflow-hidden px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold tracking-wide uppercase transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:shadow-[0_0_28px_rgba(37,99,235,0.6)] hover:brightness-110 whitespace-nowrap font-mono"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <span>Démonstration</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg border border-white/[0.1]"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMobileMenuOpen && (
          <div className="lg:hidden px-6 py-4 bg-[#0a1020] border-b border-white/[0.1] space-y-3 font-mono text-xs uppercase">
            <a
              href="#piliers-metier"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-white"
            >
              Piliers Métier
            </a>
            <a
              href="#theatre-documentaire"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-white"
            >
              Cockpit Documentaire
            </a>
            <a
              href="#cycle-de-vie-dua"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-white"
            >
              Cycle de Vie
            </a>
            <a
              href="#infrastructures"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-white"
            >
              Magasins &amp; Coffres
            </a>
            <a
              href="#cadre-securite"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-white"
            >
              Sécurité &amp; Audit
            </a>
            <div className="pt-2 border-t border-white/[0.1]">
              <Link
                href="/login"
                className="block py-2 text-blue-300 font-bold"
              >
                Portail Authentifié →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION WAHOU AVEC SCÈNE 3D & BENTO COUNTERS */}
      <main className="w-full pt-20">
        <section className="relative w-full min-h-[92vh] flex items-center overflow-hidden border-b border-white/[0.07] tech-grid">
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none animate-glow" />
          <div className="absolute bottom-10 right-1/4 w-[420px] h-[420px] bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6 sm:px-8 py-16 lg:py-24 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Colonne Titre & Accroches */}
              <div className="lg:col-span-7 space-y-8 z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.12] backdrop-blur-md">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blue-300">
                    Sovereign Records Management
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="font-mono text-[11px] text-slate-300">Norme ISO 15489</span>
                </div>

                <h1 className="font-serif text-4xl sm:text-5xl lg:text-[58px] leading-[1.08] text-white tracking-tight font-normal">
                  La mémoire légale de votre institution. <br />
                  <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-400">
                    Inaltérable, scellée, perpétuelle.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
                  Archivéo unifie la GED légale, le parapheur électronique eIDAS et la topographie géoréférencée des dépôts physiques au sein d'une enclave de souveraineté absolue.
                </p>

                {/* Boutons d'action percutants */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => {
                      setDemoSuccess(false);
                      setIsDemoModalOpen(true);
                    }}
                    className="px-6 py-3.5 rounded-lg bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white font-mono text-xs font-semibold uppercase tracking-wider shadow-[0_0_30px_rgba(37,99,235,0.45)] hover:shadow-[0_0_40px_rgba(37,99,235,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-3"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Planifier un audit d'autorité</span>
                  </button>
                  <a
                    href="#theatre-documentaire"
                    className="px-6 py-3.5 rounded-lg bg-[#0e1526]/80 hover:bg-[#131a2e] border border-white/[0.12] text-slate-200 hover:text-white font-mono text-xs font-medium uppercase tracking-wider transition-all duration-200 flex items-center gap-2.5 backdrop-blur-md"
                  >
                    <FolderCheck className="w-4 h-4 text-blue-300" />
                    <span>Ouvrir le Cockpit</span>
                  </a>
                </div>

                {/* Télémétrie cryptographique minimaliste */}
                <div className="pt-4 flex flex-wrap items-center gap-6 text-slate-400 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300 font-semibold">SHA-256</span>
                    <span>Horodatage RFC 3161</span>
                  </div>
                  <span className="text-white/20">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300 font-semibold">WORM</span>
                    <span>Immuabilité physique</span>
                  </div>
                  <span className="text-white/20">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300 font-semibold">RGS***</span>
                    <span>SecNumCloud ANSSI</span>
                  </div>
                </div>
              </div>

              {/* Colonne Scène 3D dans un écrin graphique néo-brutaliste */}
              <div className="lg:col-span-5 relative">
                <div className="relative w-full rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-[1px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-float">
                  <div className="w-full rounded-2xl bg-[#0a1020]/95 backdrop-blur-2xl overflow-hidden border border-white/[0.08]">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#060a14] border-b border-white/[0.08]">
                      <span className="font-mono text-xs text-slate-300 font-medium">NODE // EU-PAR-09</span>
                      <span className="font-mono text-[11px] text-blue-300 tracking-widest uppercase">
                        ENCLAVE SOUVERAINE
                      </span>
                    </div>

                    {/* Canvas 3D Three.js */}
                    <div className="relative w-full h-[400px] sm:h-[440px] bg-gradient-to-b from-[#070c18] to-[#040711] flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/[0.03] to-transparent h-24 w-full pointer-events-none animate-[scanline_8s_linear_infinite] z-10" />
                      <div
                        ref={canvasRef}
                        className="w-full h-full relative cursor-grab active:cursor-grabbing"
                      />

                      {/* Micro-cartes télémétriques superposées */}
                      <div className="absolute top-4 left-4 p-3 bg-black/75 backdrop-blur-md border border-white/[0.1] rounded-lg max-w-[210px] pointer-events-none transform transition hover:scale-105 z-20">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block">
                          Scellé SHA-256 Spécimen
                        </span>
                        <span className="font-mono text-xs text-blue-300 font-semibold truncate block mt-0.5">
                          ba3a503e...96be
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Vérifié RFC 3161</span>
                      </div>

                      <div className="absolute bottom-4 right-4 p-3 bg-black/75 backdrop-blur-md border border-white/[0.1] rounded-lg max-w-[200px] pointer-events-none z-20">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block">
                          Dépôt Physique
                        </span>
                        <span className="font-mono text-xs text-white font-semibold block mt-0.5">
                          BX-784 • Travée 04
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Magasin Fortifié B</span>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 bg-[#060a14] border-t border-white/[0.08] flex items-center justify-between font-mono text-[11px] text-slate-400">
                      <span>LEDGER : 14.892.104 REGISTRES</span>
                      <span className="text-slate-300">ZKP : AUTHENTIFIÉ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 BENTO KPI COUNTERS HAUTE PRÉCISION */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 pt-10 border-t border-white/[0.08]">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                <span className="font-mono text-[11px] uppercase tracking-wider text-blue-300 block">FORCE PROBANTE</span>
                <div className="font-serif text-3xl sm:text-4xl text-white font-semibold mt-1">100%</div>
                <p className="text-xs text-slate-400 mt-1">Piste d'audit SHA-256 scellée et immuable par journal horodaté.</p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                <span className="font-mono text-[11px] uppercase tracking-wider text-blue-300 block">LATENCE D'ACCÈS</span>
                <div className="font-serif text-3xl sm:text-4xl text-white font-semibold mt-1">&lt; 15 ms</div>
                <p className="text-xs text-slate-400 mt-1">Indexation multicritère instantanée sur des millions de pièces.</p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                <span className="font-mono text-[11px] uppercase tracking-wider text-blue-300 block">GOUVERNANCE</span>
                <div className="font-serif text-3xl sm:text-4xl text-white font-semibold mt-1">ISO 15489</div>
                <p className="text-xs text-slate-400 mt-1">Gestion stricte du cycle de vie documentaire &amp; règles DUA.</p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
                <span className="font-mono text-[11px] uppercase tracking-wider text-blue-300 block">INFRASTRUCTURE</span>
                <div className="font-serif text-3xl sm:text-4xl text-white font-semibold mt-1">Hybride</div>
                <p className="text-xs text-slate-400 mt-1">Parité complète entre magasins physiques et coffre-fort WORM.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. MARQUEE 1 : STANDARDS ET CERTIFICATIONS SOUVERAINES */}
        <section className="w-full bg-[#050813] border-b border-white/[0.06] py-4 overflow-hidden relative select-none">
          <div className="flex overflow-hidden">
            <div className="animate-marquee flex items-center gap-6 text-slate-300">
              {[1, 2].map((loop) => (
                <React.Fragment key={loop}>
                  <div className="flex items-center gap-3 px-5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] whitespace-nowrap">
                    <Building className="w-4 h-4 text-blue-300" />
                    <span className="font-mono text-xs uppercase tracking-wider font-medium text-white">
                      MINISTÈRE DES ARMÉES
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">DÉFENSE NATIONALE</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] whitespace-nowrap">
                    <Shield className="w-4 h-4 text-sky-400" />
                    <span className="font-mono text-xs uppercase tracking-wider font-medium text-white">
                      SECNUMCLOUD ANSSI
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">QUALIFIÉ ÉTAT</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] whitespace-nowrap">
                    <Lock className="w-4 h-4 text-blue-300" />
                    <span className="font-mono text-xs uppercase tracking-wider font-medium text-white">
                      BANQUE CENTRALE EUROPÉENNE
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">FINANCE PROBANTE</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span className="font-mono text-xs uppercase tracking-wider font-medium text-white">
                      NF Z42-013 / ISO 14641
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">ARCHIVAGE SOUVERAIN</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] whitespace-nowrap">
                    <Key className="w-4 h-4 text-blue-300" />
                    <span className="font-mono text-xs uppercase tracking-wider font-medium text-white">
                      eIDAS RÈGLEMENT (UE) 910/2014
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">CACHE TAMPON QUALIFIÉ</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] whitespace-nowrap">
                    <FolderCheck className="w-4 h-4 text-sky-400" />
                    <span className="font-mono text-xs uppercase tracking-wider font-medium text-white">
                      COUR DES COMPTES
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">CONTRÔLE JURIDICTIONNEL</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* 4. LE THÉÂTRE DOCUMENTAIRE (COCKPIT LOGICIEL DYNAMIQUE) */}
        <section className="py-24 px-6 sm:px-8 max-w-7xl mx-auto w-full" id="theatre-documentaire">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="font-mono text-xs text-blue-300 uppercase tracking-[0.2em] block mb-2">
                INTERFACE STUDIO // EXPÉRIENCE CONTRÔLE
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-white tracking-tight">Le Théâtre Documentaire</h2>
              <p className="text-slate-400 mt-2 max-w-xl text-sm sm:text-base">
                Inspection en direct d'une archive légale : métadonnées certifiées, scellement cryptographique et chaîne de visas en moins de 3 secondes.
              </p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.03] border border-white/[0.1] rounded-xl backdrop-blur-md">
              <span className="font-mono text-xs text-blue-300 font-semibold tracking-wider">DOC #ARC-2026-F9812</span>
              <span className="text-white/20">|</span>
              <span className="font-mono text-[11px] text-slate-300">SPÉCIMEN DÉMONSTRATEUR</span>
            </div>
          </div>

          {/* Pupitre Studio Bento Grid */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-[1px] shadow-2xl">
            <div className="rounded-2xl bg-[#0a1020] border border-white/[0.08] overflow-hidden">
              {/* En-tête des Onglets Cockpit */}
              <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] bg-[#060a14] px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('meta')}
                    className={`px-4 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                      activeTab === 'meta'
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Fiche &amp; Métadonnées</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-4 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                      activeTab === 'audit'
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>Preuve SHA-256</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('visa')}
                    className={`px-4 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                      activeTab === 'visa'
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Scan className="w-4 h-4" />
                    <span>Parapheur &amp; Visas</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('phys')}
                    className={`px-4 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                      activeTab === 'phys'
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    <span>Topographie Dépôt</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 py-2">
                  <span>FORMAT : PDF/A-1b</span>
                  <span className="text-white/20">•</span>
                  <span className="text-blue-300">DUA 10 ANS</span>
                </div>
              </div>

              {/* Volet 1 : Fiche & Métadonnées */}
              {activeTab === 'meta' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 p-6 rounded-xl bg-[#0e1526] border border-white/[0.08] flex flex-col justify-between space-y-6">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono text-[11px] uppercase">
                            Contrat d'Autorité
                          </span>
                          <span className="font-mono text-xs text-slate-400">REF : CONV-2026-89</span>
                        </div>
                        <h3 className="font-serif text-2xl text-white mt-4 leading-tight">
                          Convention de Conservation &amp; Marché Public Fédéral
                        </h3>
                        <p className="text-xs text-slate-400 mt-2">
                          Validé en Conseil d'Administration. Numérisation certifiée avec empreinte pérenne et métadonnées Dublin Core.
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-[#050813] border border-white/[0.06] space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">INDICE D'INTÉGRITÉ LÉGALE</span>
                          <span className="text-blue-300 font-semibold">100% CONFORME</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-full" />
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.06] space-y-1">
                        <span className="font-mono text-[11px] text-slate-400 uppercase">IDENTIFIANT PÉRENNE (ARK)</span>
                        <p className="font-mono text-xs text-white break-all pt-1">ark:/89421/c87b9a2-f9812-2026</p>
                        <p className="text-[11px] text-slate-500">Adressage immuable sur registre décentralisé.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.06] space-y-1">
                        <span className="font-mono text-[11px] text-slate-400 uppercase">DURÉE RÉTENTION (DUA)</span>
                        <p className="font-serif text-xl text-blue-300 font-semibold pt-1">10 Ans (Échéance 2036)</p>
                        <p className="text-[11px] text-slate-500">Sort final : Versement aux Archives d'État.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.06] space-y-1">
                        <span className="font-mono text-[11px] text-slate-400 uppercase">ENCODAGE &amp; VOLUME</span>
                        <p className="font-mono text-xs text-white pt-1">4.24 MB • 64 Pages • OCR 99.8%</p>
                        <p className="text-[11px] text-slate-500">Recherche plein texte vectorisée active.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.06] space-y-1">
                        <span className="font-mono text-[11px] text-slate-400 uppercase">NIVEAU DE CONFIDENTIALITÉ</span>
                        <p className="font-mono text-xs text-amber-300 pt-1">DIFFUSION RESTREINTE</p>
                        <p className="text-[11px] text-slate-500">Secret des affaires (Art. L151-1).</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Volet 2 : Preuve SHA-256 */}
              {activeTab === 'audit' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="p-5 rounded-xl bg-[#060a14] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 uppercase">Empreinte Cryptographique Racine (SHA-256)</span>
                      <span className="text-blue-300 font-medium">RECONSOLIDÉ WORM</span>
                    </div>
                    <div className="p-3.5 bg-black/60 border border-white/[0.08] rounded-lg text-blue-300 font-mono text-xs break-all select-all">
                      ba3a503ea55f31676ca1b58105368c622a135c3880f8d9bee1597f1d415f96be
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      * Empreinte spécimen calculée sur le payload du contrat légal (DOC-2025-001 / Deloitte &amp; Associés).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>09:14:22</span>
                        <span className="text-blue-300">INGESTION</span>
                      </div>
                      <p className="font-mono text-xs text-white font-medium">Dépôt coffre WORM</p>
                      <span className="font-mono text-[10px] text-slate-500 block">Agent #FR-8812 • Jeton OK</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>09:15:01</span>
                        <span className="text-blue-300">HORODATAGE</span>
                      </div>
                      <p className="font-mono text-xs text-white font-medium">RFC 3161 Scellé</p>
                      <span className="font-mono text-[10px] text-slate-500 block">Chambre Tiers de Confiance</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>10:45:18</span>
                        <span className="text-slate-400">CONSULTATION</span>
                      </div>
                      <p className="font-mono text-xs text-white font-medium">Audit d'intégrité</p>
                      <span className="font-mono text-[10px] text-slate-500 block">Contrôle Niv. 3 sans altération</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Volet 3 : Parapheur & Visas */}
              {activeTab === 'visa' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-[#0e1526] border border-blue-500/30 space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-blue-300 font-semibold">1. VISA JURIDIQUE</span>
                        <Check className="w-4 h-4 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">H. de Saint-Amand</p>
                        <p className="text-xs text-slate-400">Directrice Affaires Légales</p>
                      </div>
                      <div className="pt-2 border-t border-white/[0.06] font-mono text-[11px] text-slate-400">
                        Certificat X.509 eIDAS Qualifié
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-[#0e1526] border border-blue-500/30 space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-blue-300 font-semibold">2. CONTRÔLE BUDGÉTAIRE</span>
                        <Check className="w-4 h-4 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">M.-A. Valette</p>
                        <p className="text-xs text-slate-400">Contrôleur Général</p>
                      </div>
                      <div className="pt-2 border-t border-white/[0.06] font-mono text-[11px] text-slate-400">
                        Validation RGS ** Matériel
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-[#0e1526] border border-white/[0.1] space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-300 font-semibold">3. SIGNATURE FINALE</span>
                        <span className="font-mono text-[10px] uppercase text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                          En cours
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Pr. Laurent Bertin</p>
                        <p className="text-xs text-slate-400">Secrétaire Général</p>
                      </div>
                      <div className="pt-2 border-t border-white/[0.06] font-mono text-[11px] text-slate-400">
                        Clé Cryptographique USB
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Volet 4 : Topographie Dépôt Physique */}
              {activeTab === 'phys' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 space-y-4">
                      <div className="space-y-1">
                        <span className="font-mono text-xs text-blue-300 uppercase">
                          COORDONNÉES RAYONNAGE HAUTE SÉCURITÉ
                        </span>
                        <h4 className="font-serif text-2xl text-white">Magasin Fortifié • Dépôt Souterrain 04</h4>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 bg-[#0e1526] border border-white/[0.06] rounded-lg">
                          <span className="font-mono text-[10px] text-slate-400 block uppercase">Site</span>
                          <span className="font-serif text-lg text-white font-semibold">BÂT. B2</span>
                        </div>
                        <div className="p-3.5 bg-[#0e1526] border border-white/[0.06] rounded-lg">
                          <span className="font-mono text-[10px] text-slate-400 block uppercase">Travée</span>
                          <span className="font-serif text-lg text-white font-semibold">TR-04</span>
                        </div>
                        <div className="p-3.5 bg-[#0e1526] border border-white/[0.06] rounded-lg">
                          <span className="font-mono text-[10px] text-slate-400 block uppercase">Tablette</span>
                          <span className="font-serif text-lg text-white font-semibold">NIV-C3</span>
                        </div>
                        <div className="p-3.5 bg-[#0e1526] border border-blue-400/40 rounded-lg">
                          <span className="font-mono text-[10px] text-blue-300 block uppercase">Conteneur</span>
                          <span className="font-serif text-lg text-blue-300 font-semibold">BX-784-A</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400">
                        Boîte d'archives sans acide ISO 16245 type A, scellé RFID et QR code unitaire à contrôle récurrent.
                      </p>
                    </div>

                    <div className="md:col-span-4 p-5 rounded-xl bg-[#060a14] border border-white/[0.08] flex flex-col items-center text-center space-y-3">
                      <div className="w-28 h-28 p-2 rounded-lg bg-[#131a2e] border border-white/[0.1] flex items-center justify-center">
                        <QrCode className="w-20 h-20 text-white" />
                      </div>
                      <div>
                        <span className="font-mono text-xs text-white font-semibold block">TAG // ARC-BX-784-A</span>
                        <span className="font-mono text-[10px] text-slate-500">Récolement : Hier 18:20</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. MARQUEE 2 : FLUX & MÉTRIQUES SOUVERAINES EN DIRECT */}
        <section className="w-full bg-[#040711] border-y border-white/[0.06] py-3.5 overflow-hidden select-none">
          <div className="flex overflow-hidden">
            <div className="animate-marquee-reverse flex items-center gap-6">
              {[1, 2].map((loop) => (
                <React.Fragment key={loop}>
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur text-xs font-mono whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span className="text-blue-300 font-semibold tracking-wider">PARAPHEUR</span>
                    <span className="text-slate-300">52.840 Signatures qualifiées eIDAS apposées ce jour</span>
                  </div>

                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur text-xs font-mono whitespace-nowrap">
                    <Archive className="w-4 h-4 text-blue-300" />
                    <span className="text-blue-300 font-semibold tracking-wider">RÉCOLEMENT</span>
                    <span className="text-slate-300">450 km de linéaires physiques géoréférencés 100% conformes</span>
                  </div>

                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur text-xs font-mono whitespace-nowrap">
                    <Lock className="w-4 h-4 text-sky-400" />
                    <span className="text-blue-300 font-semibold tracking-wider">SCELLÉ WORM</span>
                    <span className="text-slate-300">0 altération détectée • Immuabilité matérielle active</span>
                  </div>

                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur text-xs font-mono whitespace-nowrap">
                    <Shield className="w-4 h-4 text-blue-300" />
                    <span className="text-blue-300 font-semibold tracking-wider">AUDIT ANSSI</span>
                    <span className="text-slate-300">SecNumCloud qualifié souverain État français</span>
                  </div>

                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur text-xs font-mono whitespace-nowrap">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span className="text-blue-300 font-semibold tracking-wider">LATENCE D'ACCÈS</span>
                    <span className="text-slate-300">&lt; 15 ms en recherche sémantique plein texte</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* 6. BENTO GRID : LES 4 PILIERS FONCTIONNELS AVEC FONDS IMMERSIFS */}
        <section className="py-24 px-6 sm:px-8 max-w-7xl mx-auto w-full" id="piliers-metier">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs text-blue-300 uppercase tracking-[0.2em]">
              ARCHITECTURE FONCTIONNELLE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white">Quatre Piliers Indissociables</h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Une infrastructure conçue sans concession pour les gouvernements, OIV et grands comptes réglementés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pilier 1 */}
            <div className="relative overflow-hidden group rounded-2xl bg-[#0e1526] border border-white/[0.08] hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col justify-between p-8">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1020] via-[#0a1020]/90 to-[#0a1020]/75 z-0 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Scan className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] text-slate-400 uppercase tracking-widest block">PILIER 01</span>
                <h3 className="font-serif text-2xl text-white">GED &amp; Numérisation Fidèle</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Ingestion à cadence industrielle, numérisation NF Z42-026 à valeur probante et classification sémantique automatique sans dépendance logicielle étrangère.
                </p>
              </div>
              <div className="relative z-10 pt-6 mt-6 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-slate-400">
                <span>50M+ PIÈCES / AN</span>
                <span className="text-blue-300 font-medium">MODULE ACTIF</span>
              </div>
            </div>

            {/* Pilier 2 */}
            <div className="relative overflow-hidden group rounded-2xl bg-[#0e1526] border border-white/[0.08] hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col justify-between p-8">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1020] via-[#0a1020]/90 to-[#0a1020]/75 z-0 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Key className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] text-slate-400 uppercase tracking-widest block">PILIER 02</span>
                <h3 className="font-serif text-2xl text-white">Parapheur Électronique Certifié</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Circuits de décision formels, co-signatures hiérarchiques et sceau de personne morale eIDAS sur clés cryptographiques qualifiées ANSSI.
                </p>
              </div>
              <div className="relative z-10 pt-6 mt-6 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-slate-400">
                <span>RÈGLEMENT (UE) 910/2014</span>
                <span className="text-blue-300 font-medium">MODULE ACTIF</span>
              </div>
            </div>

            {/* Pilier 3 */}
            <div className="relative overflow-hidden group rounded-2xl bg-[#0e1526] border border-white/[0.08] hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col justify-between p-8">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1020] via-[#0a1020]/90 to-[#0a1020]/75 z-0 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] text-slate-400 uppercase tracking-widest block">PILIER 03</span>
                <h3 className="font-serif text-2xl text-white">Records Management &amp; DUA</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Règle des 3 âges de l'archive selon l'ISO 15489. Pilotage précis des délais d'utilité administrative, gel judiciaire (Legal Hold) et PV d'élimination.
                </p>
              </div>
              <div className="relative z-10 pt-6 mt-6 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-slate-400">
                <span>NORME ISO 15489-1:2016</span>
                <span className="text-blue-300 font-medium">MODULE ACTIF</span>
              </div>
            </div>

            {/* Pilier 4 */}
            <div className="relative overflow-hidden group rounded-2xl bg-[#0e1526] border border-white/[0.08] hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col justify-between p-8">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1020] via-[#0a1020]/90 to-[#0a1020]/75 z-0 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Building className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] text-slate-400 uppercase tracking-widest block">PILIER 04</span>
                <h3 className="font-serif text-2xl text-white">Magasins d'Archives Physiques</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Cartographie 3D des entrepôts, gestion des prêts de cartons, suivi des sorties temporaires et récolement contradictoire par code optique.
                </p>
              </div>
              <div className="relative z-10 pt-6 mt-6 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-slate-400">
                <span>MULTI-ENTREPÔTS</span>
                <span className="text-blue-300 font-medium">MODULE ACTIF</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. IMMERSION BENTO : MAGASINS & CENTRE DE COMMANDEMENT */}
        <section className="py-20 px-6 sm:px-8 max-w-7xl mx-auto w-full" id="infrastructures">
          <div className="space-y-3 max-w-2xl mb-12">
            <span className="font-mono text-xs text-blue-300 uppercase tracking-[0.2em]">
              CONSERVATION HYBRIDE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white">Du Rayonnage au Registre WORM</h2>
            <p className="text-slate-400 text-sm sm:text-base">
              La seule solution souveraine réconciliant des kilomètres d'archives tangibles avec des téraoctets de données scellées.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Bento 1 : Magasins Physiques */}
            <div className="lg:col-span-7 rounded-2xl bg-[#0e1526] border border-white/[0.08] overflow-hidden flex flex-col group hover:border-blue-400/40 transition-all duration-500">
              <div className="relative w-full h-[360px] sm:h-[400px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1020] via-black/40 to-transparent" />
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/[0.1] font-mono text-xs text-white">
                  MAGASIN NIVEAU 3 • CLIMAT CONTRÔLÉ 18°C / 50% HR
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="font-mono text-[11px] text-blue-300 uppercase">Topographie Physique</span>
                  <h3 className="font-serif text-2xl text-white mt-1">Rayonnages industriels &amp; Récolement</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-lg">
                    Chaque boîte possède une géolocalisation spatiale (Entrepôt, Travée, Tablette) interconnectée à son jumeau numérique.
                  </p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-3 gap-4 text-center border-t border-white/[0.08] bg-[#070c18]">
                <div>
                  <span className="font-mono text-[10px] text-slate-400 block uppercase">Capacité</span>
                  <p className="font-serif text-xl text-white font-semibold mt-0.5">450 km</p>
                  <p className="text-[11px] text-slate-500">Linéaires gérés</p>
                </div>
                <div className="border-x border-white/[0.08]">
                  <span className="font-mono text-[10px] text-slate-400 block uppercase">Inventaire</span>
                  <p className="font-serif text-xl text-white font-semibold mt-0.5">100%</p>
                  <p className="text-[11px] text-slate-500">Conformité récolement</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-slate-400 block uppercase">Contrôle</span>
                  <p className="font-serif text-xl text-white font-semibold mt-0.5">Zone 4</p>
                  <p className="text-[11px] text-slate-500">Accès biométrique</p>
                </div>
              </div>
            </div>

            {/* Bento 2 : Centre de Commandement */}
            <div className="lg:col-span-5 rounded-2xl bg-[#0e1526] border border-white/[0.08] overflow-hidden flex flex-col group hover:border-blue-400/40 transition-all duration-500">
              <div className="relative w-full h-[360px] sm:h-[400px] overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1020] via-black/40 to-transparent" />
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/[0.1] font-mono text-xs text-white">
                  AUDIT CONSOLE • RÔLE DIRECTEUR DU PATRIMOINE
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="font-mono text-[11px] text-blue-300 uppercase">Supervision Souveraine</span>
                  <h3 className="font-serif text-2xl text-white mt-1">Gouvernance centralisée des DUA</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Pilotage des éliminations réglementaires et bordereaux de versement SEDA vers les Archives Nationales.
                  </p>
                </div>
              </div>

              <div className="p-6 flex flex-col justify-between flex-1 border-t border-white/[0.08] bg-[#070c18] space-y-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-300">SÉGRÉGATION CRYPTOGRAPHIQUE</span>
                  <span className="text-blue-300 font-semibold">NIVEAU RGS</span>
                </div>
                <p className="text-xs text-slate-400">
                  Cloisonnement strict par entité juridique. Aucune fuite de données inter-services.
                </p>
                <button
                  onClick={() => {
                    setDemoSuccess(false);
                    setIsDemoModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white font-mono text-xs uppercase tracking-wider transition-all duration-200"
                >
                  Voir le protocole d'habilitation
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 8. CYCLE DE VIE DUA (LA DOCTRINE DES 3 ÂGES SELON LE SIAF) */}
        <section className="py-24 px-6 sm:px-8 max-w-7xl mx-auto w-full border-t border-white/[0.07]" id="cycle-de-vie-dua">
          <div className="max-w-2xl mb-16 space-y-3">
            <span className="font-mono text-xs text-blue-300 uppercase tracking-[0.2em]">
              CYCLE DE VIE RÈGLEMENTAIRE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white">La Doctrine des Trois Âges</h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Conforme aux instructions du Service Interministériel des Archives de France (SIAF).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0e1526] border border-white/[0.08] hover:border-blue-400/40 transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-xs">
                  PHASE 01
                </span>
                <span className="font-mono text-xs text-slate-400">USAGE QUOTIDIEN</span>
              </div>
              <h3 className="font-serif text-xl text-white">Archives Courantes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Documents actifs nécessaires au fonctionnement immédiat des directions opérationnelles. Élaboration et parapheur de signature.
              </p>
              <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-400 space-y-1">
                <div>• Marchés en cours d'exécution</div>
                <div>• Dossiers agents en exercice</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0e1526] border-2 border-blue-500/40 shadow-[0_0_30px_rgba(37,99,235,0.15)] transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono text-xs font-semibold">
                  PHASE 02 • CLÉ
                </span>
                <span className="font-mono text-xs text-blue-300 font-semibold">VALEUR PROBANTE</span>
              </div>
              <h3 className="font-serif text-xl text-white">Archives Intermédiaires (DUA)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Conservation probante obligatoire pour délais de recours légal et contrôles d'audit. Scellement WORM inaltérable.
              </p>
              <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-400 space-y-1">
                <div>• Coffre-fort numérique souverain</div>
                <div>• Magasins physiques climatisés</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0e1526] border border-white/[0.08] hover:border-blue-400/40 transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-white/[0.05] border border-white/[0.1] text-slate-300 font-mono text-xs">
                  PHASE 03
                </span>
                <span className="font-mono text-xs text-slate-400">SORT FINAL</span>
              </div>
              <h3 className="font-serif text-xl text-white">Versement ou Destruction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                À l'échéance de la DUA : versement pérenne aux Archives d'État (format SEDA) ou destruction sécurisée par procès-verbal légal.
              </p>
              <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-400 space-y-1">
                <div>• Versement historique SEDA</div>
                <div>• Écrasement cryptographique certifié</div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. BANDEAU SÉCURITÉ & AUDIT CADRE DE CONFORMITÉ */}
        <section className="py-20 px-6 sm:px-8 max-w-7xl mx-auto w-full border-t border-white/[0.07]" id="cadre-securite">
          <div className="rounded-2xl bg-gradient-to-br from-[#0e1526] via-[#0a1020] to-[#070c18] border border-white/[0.1] p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-blue-300 uppercase">
                  <Shield className="w-4 h-4" />
                  <span>SÉCURITÉ &amp; CONFIDENTIALITÉ SOUVERAINE</span>
                </div>
                <h3 className="font-serif text-3xl text-white">
                  Conçu pour résister aux audits judiciaires les plus exigeants.
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                  Architecture 100% On-Premise ou Cloud Dédié sans transfert de données hors Union Européenne. Chiffrement AES-256 des flux et des volumes au repos, scellement SHA-256 déterministe et journal d'audit immuable conforme au standard WORM.
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-3">
                <button
                  onClick={downloadBrochure}
                  className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-semibold tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger la fiche technique</span>
                </button>
                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-slate-200 font-mono text-xs uppercase font-medium tracking-wider flex items-center justify-center gap-2 transition-colors text-center"
                >
                  <Lock className="w-4 h-4 text-blue-300" />
                  <span>Accéder à l'espace de démonstration</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 10. APPEL À L'ACTION FINAL */}
        <section className="w-full bg-[#050813] border-t border-white/[0.08] py-20 px-6 sm:px-8 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
            <span className="font-mono text-xs text-blue-300 uppercase tracking-[0.25em] block">
              SOUVERAINETÉ DOCUMENTAIRE
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl text-white">
              Sanctuarisez vos actifs informationnels dès aujourd'hui.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Nos ingénieurs et archivistes paléographes vous assistent dans le dimensionnement de vos enclaves de conservation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => {
                  setDemoSuccess(false);
                  setIsDemoModalOpen(true);
                }}
                className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono text-xs font-semibold uppercase tracking-wider shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_45px_rgba(37,99,235,0.7)] hover:scale-105 transition-all duration-300 flex items-center gap-2.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Solliciter une Démonstration</span>
              </button>
              <Link
                href="/login"
                className="px-6 py-4 rounded-lg bg-[#0e1526] hover:bg-[#131a2e] border border-white/[0.1] text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-blue-300" />
                <span>Portail Client</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 11. NOUVEAU FOOTER HAUT DE GAMME SANS VOYANTS */}
      <footer className="w-full bg-[#040711] border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#131a2e] border border-blue-400/40 flex items-center justify-center p-1.5 text-blue-300">
                <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M2.5 5.5h19v3.5h-19z" />
                  <path d="M4.5 9v10.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V9" />
                  <rect height="3" rx="0.8" width="6" x="9" y="12.5" />
                </svg>
              </div>
              <span className="font-serif text-base text-white uppercase tracking-wider font-semibold">
                ARCHIVÉO
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Opérateur souverain d'infrastructure d'archivage pérenne et de conservation à valeur probante. Datacenters hautement sécurisés localisés sur le territoire de l'Union Européenne.
            </p>
            <div className="font-mono text-[11px] text-slate-500">MATRICULE // EU-FR-8942-ARCH</div>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-white uppercase tracking-wider mb-3">Conformité &amp; Normes</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Référentiel Général de Sécurité (RGS ***)</li>
              <li>SecNumCloud Qualifié ANSSI</li>
              <li>NF Z42-013 &amp; ISO 14641 Archives</li>
              <li>Règlement eIDAS (UE) 910/2014</li>
              <li>Agrément Archives de France (SIAF)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-white uppercase tracking-wider mb-3">Opérations Techniques</h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p className="text-white font-medium">Hôtel Souverain des Données</p>
              <p>48 rue de la Conservation, 75007 Paris</p>
              <p className="font-mono text-blue-300 pt-1">support-certifie@archiveo.gouv.fr</p>
              <p className="font-mono text-[10px] text-slate-500">PGP : 4F92 B71C 01AD 89E2</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-white uppercase tracking-wider mb-3">Cadre Juridique</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Mentions Légales Institutionnelles</li>
              <li>Protection des Données (RGPD)</li>
              <li>Politique d'Archivage (PA) &amp; CPS</li>
              <li>Registre d'Horodatage et Preuves</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] py-5 px-6 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-500">
            <div>© 2026 ARCHIVÉO ENTERPRISE. TOUS DROITS RÉSERVÉS. • JURIDICTION EXCLUSIVE PARIS</div>
            <div>CORE BUILD // v5.2.0-STABLE (COMMIT 9F2A1C)</div>
          </div>
        </div>
      </footer>

      {/* 12. MODAL DE DÉMONSTRATION INSTITUTIONNELLE */}
      {isDemoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#020617]/85 backdrop-blur-md flex items-center justify-center p-4 animate-page-enter"
          onClick={() => setIsDemoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-[#0a1020] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-[#060a14] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M2.5 5.5h19v3.5h-19z" />
                    <path d="M4.5 9v10.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-serif text-lg text-white font-bold">Instruction &amp; Démonstration</h3>
                  <p className="font-mono text-[10px] text-slate-400">ENVIRONNEMENT QUALIFIÉ SOUVERAIN</p>
                </div>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!demoSuccess ? (
              <form onSubmit={handleDemoSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-mono text-xs text-slate-300">Nom &amp; Prénom *</label>
                    <input
                      type="text"
                      required
                      value={demoForm.fullName}
                      onChange={(e) => setDemoForm({ ...demoForm, fullName: e.target.value })}
                      placeholder="Valérie de Mortemart"
                      className="w-full px-3 py-2 bg-[#0e1526] border border-white/[0.1] focus:border-blue-400 text-white rounded-lg text-xs outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-xs text-slate-300">Organisation / Ministère *</label>
                    <input
                      type="text"
                      required
                      value={demoForm.company}
                      onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                      placeholder="Cour Administrative d'Appel"
                      className="w-full px-3 py-2 bg-[#0e1526] border border-white/[0.1] focus:border-blue-400 text-white rounded-lg text-xs outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-mono text-xs text-slate-300">Courriel Institutionnel *</label>
                    <input
                      type="email"
                      required
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      placeholder="nom@ministere.gouv.fr"
                      className="w-full px-3 py-2 bg-[#0e1526] border border-white/[0.1] focus:border-blue-400 text-white rounded-lg text-xs outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-xs text-slate-300">Téléphone Pro</label>
                    <input
                      type="tel"
                      value={demoForm.phone}
                      onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                      placeholder="+33 1 40 00 00 00"
                      className="w-full px-3 py-2 bg-[#0e1526] border border-white/[0.1] focus:border-blue-400 text-white rounded-lg text-xs outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-xs text-slate-300">Périmètre du Projet</label>
                  <select
                    value={demoForm.projectScope}
                    onChange={(e) => setDemoForm({ ...demoForm, projectScope: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0e1526] border border-white/[0.1] focus:border-blue-400 text-white rounded-lg text-xs outline-none transition-colors"
                  >
                    <option value="Plateforme Hybride : Entrepôts Physiques + Numérique WORM">
                      Plateforme Hybride : Entrepôts Physiques + Numérique WORM
                    </option>
                    <option value="GED Légale & Dématérialisation Fidèle (< 1M docs)">
                      GED Légale &amp; Dématérialisation Fidèle (&lt; 1M docs)
                    </option>
                    <option value="Parapheur Électronique & Signature eIDAS">
                      Parapheur Électronique &amp; Signature eIDAS
                    </option>
                    <option value="Système Complet Records Management ISO 15489 (> 10M docs)">
                      Système Complet Records Management ISO 15489 (&gt; 10M docs)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-xs text-slate-300">Besoins prioritaires &amp; Volumétrie</label>
                  <textarea
                    rows={2}
                    value={demoForm.needs}
                    onChange={(e) => setDemoForm({ ...demoForm, needs: e.target.value })}
                    placeholder="Ex: Refonte archivistique, topographie des dépôts, parapheur de visa..."
                    className="w-full px-3 py-2 bg-[#0e1526] border border-white/[0.1] focus:border-blue-400 text-white rounded-lg text-xs outline-none transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(false)}
                    className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDemo}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2"
                  >
                    {isSubmittingDemo ? (
                      <span>Transmission...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Transmettre le dossier</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-xl text-white font-bold">Requête transmise avec succès</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Un instructeur en archivistique légale prendra contact sous 24h ouvrées.
                </p>
                <button
                  onClick={() => setIsDemoModalOpen(false)}
                  className="px-5 py-2 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg text-white font-mono text-xs uppercase tracking-wider"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
