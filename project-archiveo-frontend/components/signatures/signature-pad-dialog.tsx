'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  PenTool,
  Type,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Smartphone,
  Mail,
  Loader2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { DocumentSignatureApi, signDocument } from '@/services/signatures-api';

interface SignaturePadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature: DocumentSignatureApi | null;
  onSigned: (updated: DocumentSignatureApi) => void;
}

export function SignaturePadDialog({
  open,
  onOpenChange,
  signature,
  onSigned,
}: SignaturePadDialogProps) {
  const [mode, setMode] = useState<'drawing' | 'text' | 'image'>('drawing');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState<string>('font-serif italic text-2xl');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedUserPin, setSavedUserPin] = useState<string>('');
  const [requireUserPin, setRequireUserPin] = useState<boolean>(false);
  const [savedUserSig, setSavedUserSig] = useState<string | null>(null);

  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Deep Navy Blue
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (signature) {
        setTypedName(signature.signerName || '');
      }
      if (typeof window !== 'undefined' && signature?.signerUserId) {
        const pin = localStorage.getItem(`archiveo_pin_${signature.signerUserId}`) || '';
        const req = localStorage.getItem(`archiveo_require_pin_${signature.signerUserId}`) !== 'false';
        const sig = localStorage.getItem(`archiveo_signature_data_${signature.signerUserId}`);
        setSavedUserPin(pin);
        setRequireUserPin(req && Boolean(pin));
        setSavedUserSig(sig);
      }
      setTimeout(initCanvas, 150);
    }
  }, [open, signature, initCanvas]);

  const loadSavedSignature = () => {
    if (!savedUserSig) return;
    setImagePreview(savedUserSig);
    setMode('image');
    toast.success('Votre signature de profil a été chargée avec succès !');
  };

  // Drawing Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateSignatureDataUrl = (): string | null => {
    if (mode === 'drawing') {
      if (!canvasRef.current || !hasDrawn) return null;
      return canvasRef.current.toDataURL('image/png');
    } else if (mode === 'text') {
      if (!typedName.trim()) return null;
      // Render text to canvas to get consistent Data URL
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'italic 32px "Playfair Display", "Georgia", cursive, serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      return canvas.toDataURL('image/png');
    } else {
      return imagePreview;
    }
  };

  const handleSign = async () => {
    if (!signature) return;

    if (!consentAccepted) {
      toast.error('Vous devez accepter la mention de certification pour signer.');
      return;
    }

    const dataUrl = generateSignatureDataUrl();
    if (!dataUrl) {
      toast.error('Veuillez apposer ou saisir votre signature avant de valider.');
      return;
    }
    
    if (requireUserPin && savedUserPin) {
      if (!pinCode || pinCode.trim() !== savedUserPin.trim()) {
        toast.error('Code PIN de signature incorrect. Veuillez renseigner le code PIN configuré dans votre profil.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updated = await signDocument(signature.id, {
        signatureType: mode,
        signatureDataUrl: dataUrl,
        securityPin: pinCode || undefined,
      });

      toast.success('Document signé avec succès et scellé cryptographiquement !');
      onSigned(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur lors de la signature du document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!signature) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">Parapheur Électronique — Signature du Document</DialogTitle>
              <DialogDescription>
                Réf : <span className="font-semibold text-foreground">{signature.documentReference}</span> — « {signature.documentTitle} »
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border text-sm">
          <div>
            <span className="text-muted-foreground block text-xs">Demandeur :</span>
            <span className="font-medium">{signature.requestedByUserName || 'Direction'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Signataire désigné :</span>
            <span className="font-medium">{signature.signerName} ({signature.signerEmail})</span>
          </div>
          {signature.signerPhone && (
            <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              <span>Alerte WhatsApp liée : <strong className="text-foreground">{signature.signerPhone}</strong></span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Mode d'apposition de la signature</Label>
            {savedUserSig && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadSavedSignature}
                className="h-7 gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Utiliser ma signature de profil
              </Button>
            )}
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'drawing' | 'text' | 'image')} className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="drawing" className="gap-2">
                <PenTool className="h-4 w-4" /> Dessiner
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <Type className="h-4 w-4" /> Calligraphie
              </TabsTrigger>
              <TabsTrigger value="image" className="gap-2">
                <Upload className="h-4 w-4" /> Importer image
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drawing" className="space-y-3 pt-2">
              <div className="relative border-2 border-dashed rounded-lg bg-background overflow-hidden p-1 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={160}
                  className="w-full h-40 cursor-crosshair touch-none bg-white rounded"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Dessinez à la souris ou au stylet tactile</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={initCanvas}
                  className="gap-1.5 h-7 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Effacer
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="sig-text" className="text-xs">Nom ou paraphe à calligraphier</Label>
                <Input
                  id="sig-text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Votre nom complet"
                />
              </div>
              <div className="p-6 bg-white dark:bg-slate-950 border rounded-lg flex items-center justify-center min-h-[100px] shadow-sm">
                <p className="font-serif italic text-3xl text-blue-900 tracking-wide">
                  {typedName || signature.signerName}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="sig-file" className="text-xs">Fichier image de signature (PNG transparent recommandé)</Label>
                <Input
                  id="sig-file"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                />
              </div>
              {imagePreview && (
                <div className="p-4 bg-white dark:bg-slate-950 border rounded-lg flex items-center justify-center min-h-[100px]">
                  <img src={imagePreview} alt="Aperçu signature" className="max-h-24 object-contain" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-600" /> Sceau Électronique Certifié (Norme eIDAS)
            </span>
            <Badge variant="outline" className="bg-white/80 text-[10px] text-blue-800 dark:bg-slate-900 dark:text-blue-300">
              SHA-256 Intégrité
            </Badge>
          </div>
          <p className="text-muted-foreground">
            L'acte de signature horodatera le document de façon immuable et générera un certificat d'authenticité juridique rattaché au signataire <strong>{signature.signerName}</strong>.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pin" className="text-xs flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" /> Code de sécurité / PIN de Signature {requireUserPin && <span className="text-red-500">* (Exigé par votre profil)</span>}
            </Label>
            <a href="/profile" target="_blank" className="text-[11px] text-primary hover:underline">
              Gérer mon PIN de profil →
            </a>
          </div>
          <Input
            id="pin"
            type="password"
            placeholder={requireUserPin ? "Entrez votre code PIN configuré" : "Ex : 1234 (Optionnel)"}
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
            className="h-9 text-xs font-mono tracking-wider"
            maxLength={10}
          />
        </div>

        <div className="flex items-start space-x-2 pt-1">
          <Checkbox
            id="consent"
            checked={consentAccepted}
            onCheckedChange={(c) => setConsentAccepted(Boolean(c))}
          />
          <Label htmlFor="consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
            Je certifie sur l'honneur être le signataire autorisé et j'accepte d'apposer ma signature électronique à valeur probante sur ce document.
          </Label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSign}
            disabled={isSubmitting || !consentAccepted}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signature en cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Sceller et Signer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
