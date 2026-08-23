'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState } from 'react';

interface DocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  format?: string;
  url?: string;
}

export function DocumentPreview({ open, onOpenChange, title, format = 'PDF' }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b pb-3">
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRotation((r) => r + 90)}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Télécharger
          </Button>
        </div>
        <div className="flex items-center justify-center overflow-auto bg-muted/30 rounded-lg p-8 min-h-[400px]">
          <div
            className="flex flex-col items-center justify-center bg-white shadow-lg rounded-sm transition-all"
            style={{
              width: `${zoom * 4}px`,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <div className="flex h-[500px] w-full max-w-[600px] flex-col items-center justify-center gap-4 p-8">
              <FileText className="h-16 w-16 text-primary/30" />
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-xs text-muted-foreground/60">Format: {format}</p>
              <div className="mt-4 w-full space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-2 rounded-full bg-muted" style={{ width: `${Math.random() * 40 + 60}%` }} />
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground/40">Aperçu simulé — connectez l'API pour afficher le document réel</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
