'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, FileText, ImageIcon, File } from 'lucide-react';

interface FileUploadProps {
  onFilesChange?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  className?: string;
}

export function FileUpload({
  onFilesChange,
  accept = '*',
  multiple = true,
  label = 'Glissez vos fichiers ici ou cliquez pour parcourir',
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    const updated = multiple ? [...files, ...newFiles] : newFiles;
    setFiles(updated);
    onFilesChange?.(updated);
  }, [files, multiple, onFilesChange]);

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {accept === '*' ? 'Tous formats' : accept} — Max 10 Mo par fichier
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const Icon = getIcon(file.type);
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} Ko</p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
