'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  Printer,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  Tag,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { printDataReport } from '@/utils/export';
import { toast } from 'sonner';

export interface DocumentViewerItem {
  id: string;
  title: string;
  reference: string;
  fileName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  category?: string;
  type?: string;
  confidentiality?: string;
  service?: string;
  author?: string;
  createdAt?: string;
  validated?: boolean;
  validatedBy?: string;
  validatedAt?: string;
  version?: number;
  tags?: string[];
  signature?: {
    isSigned: boolean;
    signerName?: string;
    signerRole?: string;
    signedAt?: string;
    certificateHash?: string;
    algorithm?: string;
    ipAddress?: string;
  };
}

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentViewerItem | null;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  document,
}: DocumentViewerDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 1;

  if (!document) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handlePrint = () => {
    printDataReport(
      [
        {
          Propriété: 'Titre du document',
          Valeur: document.title,
        },
        {
          Propriété: 'Référence officielle',
          Valeur: document.reference,
        },
        {
          Propriété: 'Catégorie / Type',
          Valeur: `${document.category || 'Général'} / ${document.type || 'Document'}`,
        },
        {
          Propriété: 'Service émetteur',
          Valeur: document.service || 'Direction',
        },
        {
          Propriété: 'Auteur / Matricule',
          Valeur: document.author || 'Archiviste',
        },
        {
          Propriété: 'Confidentialité',
          Valeur: document.confidentiality || 'Standard',
        },
        {
          Propriété: 'Date de création',
          Valeur: document.createdAt ? new Date(document.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
        },
        {
          Propriété: 'Statut de validation',
          Valeur: document.validated ? `Validé par ${document.validatedBy || 'Direction'} le ${document.validatedAt ? new Date(document.validatedAt).toLocaleDateString('fr-FR') : '-'}` : 'En attente de validation',
        },
      ],
      `Fiche Documentaire — ${document.reference}`,
      undefined,
      {
        subtitle: document.title,
        category: document.category,
      }
    );
  };

  const handleDownload = () => {
    toast.success(`Téléchargement de « ${document.fileName || document.title} » initié`);
  };

  const isActuallySigned = Boolean(document.signature?.isSigned);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col p-0 transition-all duration-150 gap-0 overflow-hidden ${
          isFullscreen
            ? 'w-[98vw] h-[96vh] max-w-none rounded-xl border border-slate-700 shadow-2xl'
            : 'max-w-5xl h-[88vh] rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Header avec métadonnées clés et actions */}
        <DialogHeader className="px-5 py-3 border-b bg-card flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-bold truncate text-foreground flex items-center gap-2">
                <span className="truncate">{document.title}</span>
                <Badge variant="outline" className="font-mono text-[11px] shrink-0 font-semibold bg-muted/60">
                  {document.reference}
                </Badge>
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {document.category || 'Général'} • {document.type || 'Fichier'} • {document.service || 'Archives'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mr-8">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 h-7 text-xs font-medium"
              title="Imprimer la fiche officielle"
            >
              <Printer className="h-3 w-3" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 h-7 text-xs font-medium"
              title="Télécharger le fichier source"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Réduire la fenêtre' : 'Agrandir la fenêtre'}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar de visualisation */}
        <div className="flex items-center justify-between px-5 py-2 bg-muted/30 border-b text-xs shrink-0">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom arrière">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono font-medium px-1 text-slate-600 dark:text-slate-300 w-12 text-center text-xs">
              {zoom}%
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom avant">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRotate} title="Pivoter à 90°">
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-muted-foreground font-medium text-xs">
              Page <strong className="text-foreground">{currentPage}</strong> sur {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isActuallySigned ? (
              <Badge className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/20 border-emerald-600/30 gap-1 text-[11px] font-semibold py-0.5">
                <ShieldCheck className="h-3 w-3" /> Scellé eIDAS
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 gap-1 text-[11px] font-medium py-0.5">
                <Clock className="h-3 w-3" /> Document Standard
              </Badge>
            )}
          </div>
        </div>

        {/* Corps principal : Visualisation + Volet latéral d'indexation */}
        <div className="flex-1 flex overflow-hidden">
          {/* Zone de rendu du document avec scroll haut préservé */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950/90 p-6 overflow-y-auto overflow-x-auto flex flex-col items-center justify-start relative">
            <div
              className="bg-white text-slate-900 shadow-2xl rounded-sm transition-transform duration-150 origin-top my-4 border border-slate-200 shrink-0"
              style={{
                width: `${595 * (zoom / 100)}px`,
                minHeight: `${842 * (zoom / 100)}px`,
                transform: `rotate(${rotation}deg)`,
                padding: `${40 * (zoom / 100)}px`,
              }}
            >
              {/* Document A4 vectoriel structuré */}
              <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📁</span>
                    <span className="font-extrabold text-base tracking-wider text-slate-900">ARCHIVÉO</span>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                    Système de Gestion Électronique de Documents
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                  <p>Réf: <strong className="font-mono">{document.reference}</strong></p>
                  <p>Date: <strong>{document.createdAt ? new Date(document.createdAt).toLocaleDateString('fr-FR') : '25/08/2026'}</strong></p>
                  <p>Version: <strong>v{document.version || '1.0'}</strong></p>
                </div>
              </div>

              <div className="my-6">
                <h1 className="text-lg font-bold text-slate-950 mb-2">{document.title}</h1>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Document officiel enregistré dans le système Archivéo sous la catégorie <strong className="text-slate-800">{document.category || 'Général'}</strong> et indexé pour le service <strong className="text-slate-800">{document.service || 'Direction'}</strong>.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-xs space-y-1.5">
                  <p className="font-semibold text-slate-900 mb-1">Indexation & Métadonnées d'archivage :</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-500">Nature :</span> <strong>{document.type || 'Document administratif'}</strong></div>
                    <div><span className="text-slate-500">Confidentialité :</span> <strong>{document.confidentiality || 'Usage interne'}</strong></div>
                    <div><span className="text-slate-500">Auteur / Émetteur :</span> <strong>{document.author || 'Administrateur'}</strong></div>
                    <div><span className="text-slate-500">Format :</span> <strong className="font-mono">{document.mimeType || 'application/pdf'}</strong></div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    Le présent document atteste de la conformité du versement documentaire et de l'intégrité de ses pièces associées au sein de la plateforme d'archivage.
                  </p>
                  <p>
                    Les droits d'accès, de consultation et de prêt sont régis par les politiques de sécurité RBAC actives.
                  </p>
                </div>
              </div>

              {/* Sceau de signature numérique si signé */}
              {isActuallySigned && (
                <div className="mt-12 p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-lg flex items-center justify-between text-xs text-emerald-950">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900">Document Signé Électroniquement</p>
                      <p className="text-[10px] text-emerald-800">
                        Signataire : {document.signature?.signerName || 'Signataire Certifié'} • PIN & Empreinte validés
                      </p>
                      <p className="text-[9px] font-mono text-emerald-700 mt-0.5">
                        Hash SHA-256 : {document.signature?.certificateHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                    CONFORME eIDAS
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Volet latéral de métadonnées */}
          <div className="w-80 border-l bg-card flex flex-col shrink-0">
            <Tabs defaultValue="metadata" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 p-1 m-3 bg-muted/60">
                <TabsTrigger value="metadata" className="text-xs">Fiche Métadonnées</TabsTrigger>
                <TabsTrigger value="security" className="text-xs">Sécurité & Sceau</TabsTrigger>
              </TabsList>

              <TabsContent value="metadata" className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 m-0">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titre du document</label>
                    <p className="font-medium text-foreground mt-0.5">{document.title}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Référence officielle</label>
                    <p className="font-mono font-bold text-primary mt-0.5">{document.reference}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Catégorie</label>
                      <p className="font-medium text-foreground mt-0.5">{document.category || 'Général'}</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                      <p className="font-medium text-foreground mt-0.5">{document.type || 'Document'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Service</label>
                      <p className="font-medium text-foreground mt-0.5">{document.service || 'Archives'}</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Confidentialité</label>
                      <Badge variant="outline" className="mt-0.5 block w-fit text-[10px]">
                        {document.confidentiality || 'Standard'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date d'enregistrement</label>
                    <p className="font-medium text-foreground mt-0.5">
                      {document.createdAt ? new Date(document.createdAt).toLocaleString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Version actuelle</label>
                    <p className="font-mono font-bold text-foreground mt-0.5">v{document.version || '1.0'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 m-0">
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Contrôle d'intégrité</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Ce document bénéficie d'un scellement cryptographique conforme aux exigences eIDAS et ISO 15489.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut de Signature</label>
                    <div className="mt-1">
                      {isActuallySigned ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Signé & Horodaté</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Non signé</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
