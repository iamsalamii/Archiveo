'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ShieldCheck, Lock, Cpu, Sparkles } from 'lucide-react';

interface AuthTransitionLoaderProps {
  isOpen: boolean;
  destination: string;
  onComplete?: () => void;
}

export function AuthTransitionLoader({ isOpen, destination, onComplete }: AuthTransitionLoaderProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initialisation de l’environnement...');

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            router.push(destination);
            onComplete?.();
          }, 200);
          return 100;
        }

        const next = prev + Math.floor(Math.random() * 12 + 10);
        if (next < 35) {
          setStatusMessage('Initialisation de la session chiffrée SSL / AES-256...');
        } else if (next < 75) {
          setStatusMessage('Vérification de l’intégrité du coffre-fort documentaire...');
        } else {
          setStatusMessage('Accès sécurisé autorisé — Chargement du portail Archivéo...');
        }
        return next > 100 ? 100 : next;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [isOpen, destination, router, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl text-white transition-all animate-in fade-in duration-300">
      {/* Background glowing aura */}
      <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/30 via-indigo-600/30 to-purple-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center space-y-6">
        {/* Animated Glowing Logo Icon */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-md opacity-70 animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl border border-white/20">
            <Archive className="h-10 w-10 text-white animate-bounce" />
          </div>
        </div>

        {/* Brand & Loading Label */}
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
            Archivéo Enterprise
            <Sparkles className="h-4 w-4 text-blue-400" />
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            PORTAIL SÉCURISÉ ISO 15489 & RGPD
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(59,130,246,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-400" /> Sécurisé
            </span>
            <span className="text-blue-400 font-bold">{progress}%</span>
          </div>
        </div>

        {/* Dynamic status message */}
        <p className="text-xs text-slate-300 min-h-[32px] leading-relaxed transition-all">
          {statusMessage}
        </p>
      </div>
    </div>
  );
}
