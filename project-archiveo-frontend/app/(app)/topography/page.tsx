'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParameterSelect } from '@/components/shared/parameter-select';
import { useParameters } from '@/contexts/parameters-context';
import { useI18n } from '@/contexts/i18n-context';
import {
  Boxes,
  Warehouse,
  Plus,
  QrCode,
  Printer,
  Trash2,
  Pencil,
  Search,
  CheckCircle2,
  MapPin,
  Barcode,
  FolderArchive,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ArchiveBox {
  id: string;
  code: string;
  building: string;
  room: string;
  bay: string;
  shelf: string;
  title: string;
  department: string;
  retentionYear: number;
  totalDocuments: number;
  status: 'active' | 'full' | 'archived';
}

const STORAGE_KEY = 'archiveo_topography_boxes';

const DEFAULT_BOXES: ArchiveBox[] = [
  {
    id: 'box-001',
    code: 'BX-FIN-2014',
    building: 'Bâtiment Principal A',
    room: 'Magasin A',
    bay: 'Travée T01',
    shelf: 'Étagère E03',
    title: 'Dossiers Fiscaux & Liasses Déclaratives 2014-2018',
    department: 'Direction Financière',
    retentionYear: 2028,
    totalDocuments: 48,
    status: 'full',
  },
  {
    id: 'box-002',
    code: 'BX-RH-2015',
    building: 'Bâtiment Principal A',
    room: 'Magasin A',
    bay: 'Travée T02',
    shelf: 'Étagère E01',
    title: 'Dossiers du Personnel Salariés Sortis 2015-2019',
    department: 'Ressources Humaines',
    retentionYear: 2045,
    totalDocuments: 32,
    status: 'active',
  },
  {
    id: 'box-003',
    code: 'BX-JUR-FONC-01',
    building: 'Bâtiment Principal A',
    room: 'Coffre-fort Sécurisé',
    bay: 'Travée T01',
    shelf: 'Étagère E01',
    title: 'Actes Notariés, Statuts Constitutifs & Titres Fonciers',
    department: 'Direction Juridique',
    retentionYear: 2055,
    totalDocuments: 16,
    status: 'archived',
  },
  {
    id: 'box-004',
    code: 'BX-ACH-2012',
    building: "Dépôt Central d'Archivage",
    room: 'Magasin B',
    bay: 'Travée T03',
    shelf: 'Étagère E04',
    title: 'Contrats Fournisseurs Échus et Marchés Clos 2012-2016',
    department: 'Achats & Logistique',
    retentionYear: 2024,
    totalDocuments: 64,
    status: 'full',
  },
  {
    id: 'box-005',
    code: 'BX-DSI-2018',
    building: 'Bâtiment Principal A',
    room: 'Magasin A',
    bay: 'Travée T04',
    shelf: 'Étagère E02',
    title: 'Bordereaux de Versement & Recettes Applicatives DSI',
    department: "Systèmes d'Information",
    retentionYear: 2030,
    totalDocuments: 24,
    status: 'active',
  },
  {
    id: 'box-006',
    code: 'BX-MED-2010',
    building: 'Bâtiment Principal A',
    room: 'Coffre-fort Sécurisé',
    bay: 'Travée T01',
    shelf: 'Étagère E02',
    title: "Dossiers Médicaux & Fiches d'Aptitude au Travail",
    department: 'Médecine du Travail',
    retentionYear: 2050,
    totalDocuments: 52,
    status: 'archived',
  },
  {
    id: 'box-007',
    code: 'BX-PATR-001',
    building: 'Bâtiment Annexe B',
    room: 'Salle des Calques & Plans C',
    bay: 'Travée T02',
    shelf: 'Étagère E03',
    title: "Plans d'Architecte & Permis de Construire Siège Social",
    department: 'Patrimoine & Immobilier',
    retentionYear: 2099,
    totalDocuments: 14,
    status: 'archived',
  },
  {
    id: 'box-008',
    code: 'BX-DIR-2023',
    building: 'Bâtiment Principal A',
    room: 'Magasin A',
    bay: 'Travée T05',
    shelf: 'Étagère E05',
    title: "Procès-Verbaux des Conseils d'Administration 2020-2024",
    department: 'Direction Générale',
    retentionYear: 2054,
    totalDocuments: 28,
    status: 'active',
  },
];

export default function TopographyPage() {
  const { t } = useI18n();
  const { getItems, getItemName } = useParameters();
  const [boxes, setBoxes] = useState<ArchiveBox[]>(DEFAULT_BOXES);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<ArchiveBox | null>(null);
  const [form, setForm] = useState<Partial<ArchiveBox>>({});

  // Paramètres dynamiques depuis la base de données
  const dynamicSites = getItems('SITE');
  const dynamicBuildings = getItems('BUILDING');
  const dynamicLocations = getItems('LOCATION');
  const dynamicRooms = getItems('ROOM');

  // Charger depuis le stockage local avec fallback
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBoxes(parsed);
        } else {
          setBoxes(DEFAULT_BOXES);
        }
      } else {
        setBoxes(DEFAULT_BOXES);
      }
    } catch {
      setBoxes(DEFAULT_BOXES);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sauvegarder automatiquement dès qu'un élément change
  const saveBoxes = (newBoxes: ArchiveBox[]) => {
    setBoxes(newBoxes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBoxes));
    } catch {
      // ignore
    }
  };

  const availableBuildings = useMemo(() => {
    const list = new Set<string>();
    dynamicSites.forEach((s) => list.add(s.name));
    dynamicBuildings.forEach((b) => list.add(b.name));
    boxes.forEach((b) => {
      if (b.building) list.add(b.building);
    });
    if (list.size === 0) list.add('Bâtiment Principal');
    return Array.from(list);
  }, [dynamicSites, dynamicBuildings, boxes]);

  const filteredBoxes = useMemo(() => {
    return boxes.filter((b) => {
      const matchSearch =
        (b.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.department || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.room || '').toLowerCase().includes(search.toLowerCase());

      const matchBuilding =
        selectedBuilding === 'all' || b.building === selectedBuilding;

      return matchSearch && matchBuilding;
    });
  }, [boxes, search, selectedBuilding]);

  const stats = useMemo(() => {
    const totalBoxes = boxes.length;
    const totalDocs = boxes.reduce((acc, b) => acc + (b.totalDocuments || 0), 0);
    const uniqueRooms = new Set(boxes.map((b) => `${b.building}-${b.room}`)).size;
    return { totalBoxes, totalDocs, uniqueRooms };
  }, [boxes]);

  const handleOpenNew = () => {
    setSelectedBox(null);
    setForm({
      code: `BOX-${new Date().getFullYear()}-${String(boxes.length + 1).padStart(3, '0')}`,
      building: '',
      room: '',
      bay: '',
      shelf: '',
      title: '',
      department: '',
      retentionYear: new Date().getFullYear() + 10,
      totalDocuments: 1,
      status: 'active',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (box: ArchiveBox) => {
    setSelectedBox(box);
    setForm({ ...box });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.code?.trim() || !form.title?.trim()) {
      toast.error('Le code carton et le titre du contenu sont obligatoires');
      return;
    }

    const boxData: ArchiveBox = {
      id: selectedBox ? selectedBox.id : String(Date.now()),
      code: form.code.trim().toUpperCase(),
      building: form.building?.trim() || 'Bâtiment Principal',
      room: form.room?.trim() || 'Magasin A',
      bay: form.bay?.trim() || 'Travée T01',
      shelf: form.shelf?.trim() || 'Étagère E01',
      title: form.title.trim(),
      department: form.department?.trim() || 'Direction Générale',
      retentionYear: form.retentionYear || new Date().getFullYear() + 10,
      totalDocuments: form.totalDocuments || 1,
      status: form.status || 'active',
    };

    if (selectedBox) {
      const updated = boxes.map((b) => (b.id === selectedBox.id ? boxData : b));
      saveBoxes(updated);
      toast.success(`Carton ${boxData.code} mis à jour`);
    } else {
      saveBoxes([boxData, ...boxes]);
      toast.success(`Nouveau carton ${boxData.code} enregistré dans la topographie`);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string, code: string) => {
    if (!confirm(`Supprimer le carton ${code} de la topographie ?`)) return;
    const remaining = boxes.filter((b) => b.id !== id);
    saveBoxes(remaining);
    toast.success(`Carton ${code} supprimé`);
  };

  // Impression des étiquettes : Individuelle (format étiquette adhésive 100x60mm) ou Planche A4
  const handlePrintLabels = (targetBoxes: ArchiveBox[], isSingleSticker = false) => {
    if (targetBoxes.length === 0) {
      toast.error('Aucun carton sélectionné pour l’impression');
      return;
    }

    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) {
      toast.error('Veuillez autoriser les fenêtres pop-up');
      return;
    }

    if (isSingleSticker && targetBoxes.length === 1) {
      const b = targetBoxes[0];
      // Format étiquette adhésive compacte pour carton (100mm x 60mm)
      win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Étiquette Carton — ${b.code}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      width: 100mm;
      height: 60mm;
      padding: 4mm;
      background: #fff;
      color: #0f172a;
    }
    .sticker {
      border: 2px solid #0f172a;
      border-radius: 4px;
      padding: 3mm;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .st-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 2mm;
    }
    .st-brand {
      font-size: 10pt;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .st-badge {
      background: #0f172a;
      color: #fff;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 1.5px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .st-body {
      display: flex;
      gap: 3mm;
      align-items: center;
      margin: 1.5mm 0;
    }
    .st-qr {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid #94a3b8;
      padding: 2px;
      background: #f8fafc;
      border-radius: 3px;
    }
    .st-qr-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.5pt;
      font-weight: 800;
      margin-top: 1.5px;
    }
    .st-details {
      flex: 1;
    }
    .st-title {
      font-size: 8.5pt;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 1.5mm;
      color: #0f172a;
    }
    .st-line {
      font-size: 7pt;
      color: #334155;
      margin: 0.5mm 0;
    }
    .st-footer {
      border-top: 1px dashed #94a3b8;
      padding-top: 1.5mm;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
    }
    @media print {
      @page {
        size: 100mm 60mm;
        margin: 0;
      }
      body {
        width: 100mm;
        height: 60mm;
      }
    }
  </style>
</head>
<body>
  <div class="sticker">
    <div class="st-header">
      <span class="st-brand">ARCHIVÉO — GESTION DES ARCHIVES</span>
      <span class="st-badge">${b.building}</span>
    </div>
    <div class="st-body">
      <div class="st-qr">
        <svg width="58" height="58" viewBox="0 0 100 100" fill="#0f172a">
          <rect x="5" y="5" width="28" height="28" />
          <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
          <rect x="13" y="13" width="12" height="12" />
          <rect x="67" y="5" width="28" height="28" />
          <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
          <rect x="75" y="13" width="12" height="12" />
          <rect x="5" y="67" width="28" height="28" />
          <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
          <rect x="13" y="75" width="12" height="12" />
          <rect x="40" y="10" width="8" height="8" />
          <rect x="50" y="20" width="8" height="8" />
          <rect x="40" y="30" width="18" height="8" />
          <rect x="45" y="45" width="10" height="10" />
          <rect x="20" y="45" width="8" height="8" />
          <rect x="70" y="45" width="15" height="8" />
          <rect x="40" y="65" width="15" height="15" />
          <rect x="65" y="70" width="20" height="8" />
          <rect x="70" y="85" width="15" height="8" />
        </svg>
        <span class="st-qr-text">${b.code}</span>
      </div>
      <div class="st-details">
        <h4 class="st-title">${b.title}</h4>
        <p class="st-line"><strong>Magasin :</strong> ${b.room} • ${b.bay} / ${b.shelf}</p>
        <p class="st-line"><strong>Service :</strong> ${b.department}</p>
        <p class="st-line"><strong>Échéance de conservation :</strong> <strong>${b.retentionYear}</strong></p>
      </div>
    </div>
    <div class="st-footer">
      <span>TOPO: ${b.room.slice(0, 4).toUpperCase()}-${b.bay.replace(/\s+/g, '')}-${b.shelf.replace(/\s+/g, '')}</span>
      <span>${b.totalDocuments} pièces</span>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`);
      win.document.close();
      return;
    }

    // Format Planche A4 complète
    const labelHtml = targetBoxes
      .map(
        (b) => `
      <div class="label-card">
        <div class="label-header">
          <div class="brand">
            <span class="logo">📁</span>
            <strong>ARCHIVÉO</strong>
          </div>
          <span class="badge">${b.building}</span>
        </div>
        
        <div class="label-body">
          <div class="qr-sim">
            <svg width="76" height="76" viewBox="0 0 100 100" fill="#0f172a">
              <rect x="5" y="5" width="28" height="28" />
              <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
              <rect x="13" y="13" width="12" height="12" />
              <rect x="67" y="5" width="28" height="28" />
              <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
              <rect x="75" y="13" width="12" height="12" />
              <rect x="5" y="67" width="28" height="28" />
              <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
              <rect x="13" y="75" width="12" height="12" />
              <rect x="40" y="10" width="8" height="8" />
              <rect x="50" y="20" width="8" height="8" />
              <rect x="40" y="30" width="18" height="8" />
              <rect x="45" y="45" width="10" height="10" />
              <rect x="20" y="45" width="8" height="8" />
              <rect x="70" y="45" width="15" height="8" />
              <rect x="40" y="65" width="15" height="15" />
              <rect x="65" y="70" width="20" height="8" />
              <rect x="70" y="85" width="15" height="8" />
            </svg>
            <span class="qr-code-text">${b.code}</span>
          </div>

          <div class="label-info">
            <h3 class="box-title">${b.title}</h3>
            <p class="loc-text"><strong>Magasin :</strong> ${b.room} • ${b.bay}</p>
            <p class="loc-text"><strong>Étagère :</strong> ${b.shelf}</p>
            <p class="loc-text"><strong>Service :</strong> ${b.department}</p>
            <p class="loc-text"><strong>Échéance de conservation :</strong> <span class="year-badge">${b.retentionYear}</span></p>
          </div>
        </div>

        <div class="label-footer">
          <span>Réf Topo: ${b.room.slice(0, 4).toUpperCase()}-${b.bay.replace(/\s+/g, '')}-${b.shelf.replace(/\s+/g, '')}</span>
          <span>Archivage Physique Officiel</span>
        </div>
      </div>
    `
      )
      .join('');

    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Planche d'Étiquettes d'Archives — Archivéo</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      padding: 10mm;
      background: #fff;
      color: #0f172a;
    }
    .grid-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8mm;
    }
    .label-card {
      border: 2px solid #0f172a;
      border-radius: 6px;
      padding: 12px 14px;
      page-break-inside: avoid;
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 65mm;
    }
    .label-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11pt;
    }
    .badge {
      background: #0f172a;
      color: #fff;
      font-size: 8pt;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .label-body {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .qr-sim {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid #cbd5e1;
      padding: 4px;
      border-radius: 4px;
      background: #f8fafc;
    }
    .qr-code-text {
      font-family: monospace;
      font-size: 7.5pt;
      font-weight: 800;
      margin-top: 4px;
      color: #0f172a;
    }
    .label-info {
      flex: 1;
    }
    .box-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .loc-text {
      font-size: 8pt;
      color: #334155;
      margin: 1.5px 0;
    }
    .year-badge {
      font-weight: 800;
      color: #0284c7;
    }
    .label-footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 5px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="grid-container">
    ${labelHtml}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('topography.title', "Topographie des Dépôts & Magasins")}
        subtitle={t('topography.subtitle', "Cartographie physique des rayonnages, travées, boîtes d'archives et impression d'étiquettes QR Code / Code-barres")}
        icon={<Warehouse className="h-6 w-6" />}
        exportData={filteredBoxes.map((b) => ({
          'Code Carton': b.code,
          Titre: b.title,
          Bâtiment: b.building,
          Magasin: b.room,
          Travée: b.bay,
          Étagère: b.shelf,
          Service: b.department,
          'Total Documents': b.totalDocuments,
          'Échéance Conservation': b.retentionYear,
        }))}
        exportFilename="inventaire-topographique-magasins"
        exportTitle={t('topography.title', "Inventaire Topographique des Magasins d'Archives")}
      />

      {/* Cartes métriques récapitulatives */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Cartons & Boîtes Répertoriés</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats.totalBoxes}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enregistrés dans le plan topo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Magasins d'Archives Actifs</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats.uniqueRooms}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Salles et dépôts identifiés</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
              <FolderArchive className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Unités Documentaires Physiques</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats.totalDocs}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Dossiers et pièces conservés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'action et filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code, magasin, service..."
              className="pl-9 text-xs"
            />
          </div>

          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-[200px] text-xs">
              <SelectValue placeholder="Tous les bâtiments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les bâtiments</SelectItem>
              {availableBuildings.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {boxes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintLabels(filteredBoxes, false)}
              className="gap-2 text-xs"
            >
              <Printer className="h-4 w-4" /> Imprimer planche QR ({filteredBoxes.length})
            </Button>
          )}
          <Button size="sm" onClick={handleOpenNew} className="gap-2 text-xs">
            <Plus className="h-4 w-4" /> Nouveau Carton / Rayon
          </Button>
        </div>
      </div>

      {/* Tableau d'inventaire topographique */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-card pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Inventaire Topographique des Rayonnages</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {filteredBoxes.length} carton(s) répertorié(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted/60">
                <tr className="border-b">
                  <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Code Carton</th>
                  <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Titre / Contenu</th>
                  <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Emplacement Topo</th>
                  <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Service</th>
                  <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Pièces</th>
                  <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Échéance</th>
                  <th className="px-3.5 py-2.5 text-right text-xs font-bold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBoxes.length > 0 ? (
                  filteredBoxes.map((box) => (
                    <tr key={box.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <Barcode className="h-4 w-4 text-primary shrink-0" />
                          <code className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded">
                            {box.code}
                          </code>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 max-w-xs">
                        <p className="font-medium text-sm text-foreground truncate">{box.title}</p>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span>{box.room}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-semibold text-primary">{box.bay} / {box.shelf}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{box.building}</p>
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge variant="outline" className="text-xs">
                          {box.department}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-xs text-foreground">
                        {box.totalDocuments}
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-mono text-xs">
                          {box.retentionYear}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => handlePrintLabels([box], true)}
                            title="Générer l'étiquette adhésive pour carton (100x60mm)"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(box)}
                            title="Modifier l'emplacement"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(box.id, box.code)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <FolderArchive className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium">Aucun carton dans la topographie pour le moment.</p>
                      <p className="text-xs text-muted-foreground/80 mt-1 mb-4">
                        Cliquez sur « Nouveau Carton / Rayon » pour enregistrer votre premier emplacement physique.
                      </p>
                      <Button size="sm" onClick={handleOpenNew} className="gap-2">
                        <Plus className="h-4 w-4" /> Enregistrer un carton
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Création / Modification 100% Paramétrable */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedBox ? 'Modifier le carton / emplacement' : 'Enregistrer un nouveau carton dans la topographie'}
            </DialogTitle>
            <DialogDescription>
              Coordonnées de localisation alimentées par le dictionnaire des paramètres système.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-code">Code Carton / Réf *</Label>
                <Input
                  id="b-code"
                  value={form.code ?? ''}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="font-mono"
                  placeholder="Ex: CARTON-2024-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-retention">Année de rétention</Label>
                <Input
                  id="b-retention"
                  type="number"
                  value={form.retentionYear ?? 2035}
                  onChange={(e) => setForm({ ...form, retentionYear: parseInt(e.target.value) || 2035 })}
                  placeholder="Ex: 2035"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-title">Titre / Contenu du carton *</Label>
              <Input
                id="b-title"
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Factures Fournisseurs & Pièces Comptables"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bâtiment / Site</Label>
                <ParameterSelect
                  groupCode="SITE"
                  value={form.building ?? ''}
                  onValueChange={(v) => setForm({ ...form, building: getItemName('SITE', v) || v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Magasin / Salle</Label>
                <ParameterSelect
                  groupCode="LOCATION"
                  value={form.room ?? ''}
                  onValueChange={(v) => setForm({ ...form, room: getItemName('LOCATION', v) || v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Travée / Rayon</Label>
                <ParameterSelect
                  groupCode="BAY"
                  value={form.bay ?? ''}
                  onValueChange={(v) => setForm({ ...form, bay: getItemName('BAY', v) || v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Étagère / Tablette</Label>
                <ParameterSelect
                  groupCode="SHELF"
                  value={form.shelf ?? ''}
                  onValueChange={(v) => setForm({ ...form, shelf: getItemName('SHELF', v) || v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-dept">Service d'origine</Label>
                <ParameterSelect
                  groupCode="SERVICE"
                  value={form.department ?? ''}
                  onValueChange={(v) => setForm({ ...form, department: getItemName('SERVICE', v) || v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-docs">Nombre de documents</Label>
                <Input
                  id="b-docs"
                  type="number"
                  value={form.totalDocuments ?? 1}
                  onChange={(e) => setForm({ ...form, totalDocuments: parseInt(e.target.value) || 0 })}
                  placeholder="Ex: 25"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
