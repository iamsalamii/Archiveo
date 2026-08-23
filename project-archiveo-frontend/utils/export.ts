/**
 * Utilitaires d'exportation et d'impression professionnelle data-driven pour Archivéo
 */

export interface ExportColumn<T> {
  key: keyof T;
  label: string;
}

export interface ReportMetadata {
  organization?: string;
  subtitle?: string;
  author?: string;
  filterSummary?: string;
  category?: string;
}

/**
 * Moteur d'impression métier A4 — Génération dynamique de rapport structuré
 * (Ne capture JAMAIS l'interface Web ou les barres latérales)
 */
export function printDataReport<T extends Record<string, unknown>>(
  data: T[],
  title: string,
  columns?: ExportColumn<T>[],
  metadata?: ReportMetadata
): void {
  if (!data || data.length === 0) {
    if (typeof window !== 'undefined') {
      window.alert('Aucune donnée à imprimer pour cet état.');
    }
    return;
  }

  const cols = columns ?? Object.keys(data[0]).map((k) => ({
    key: k as keyof T,
    label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
  }));

  const win = window.open('', '_blank', 'width=1024,height=800');
  if (!win) {
    alert('Veuillez autoriser les fenêtres contextuelles (popups) pour imprimer le rapport.');
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const orgName = metadata?.organization || 'ARCHIVÉO — GED & RECORDS MANAGEMENT';
  const subtitle = metadata?.subtitle || 'Rapport officiel d’état et d’inventaire des données';
  const author = metadata?.author || 'Utilisateur du système';
  const filterInfo = metadata?.filterSummary ? `<div class="filter-badge">Filtres appliqués : ${metadata.filterSummary}</div>` : '';

  const headerCells = cols.map((c) => `<th>${c.label}</th>`).join('');
  const bodyRows = data
    .map(
      (row, index) =>
        `<tr>
          <td class="row-index">${index + 1}</td>
          ${cols
            .map((c) => {
              const val = row[c.key as string];
              const displayVal = val === null || val === undefined ? '-' : String(val);
              return `<td>${displayVal}</td>`;
            })
            .join('')}
        </tr>`
    )
    .join('');

  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title} — ${orgName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #fff;
      font-size: 11pt;
      line-height: 1.5;
      padding: 20mm;
    }
    
    /* En-tête officiel */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: white;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
    }
    .brand-text h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-text p {
      font-size: 9pt;
      color: #64748b;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .report-meta {
      text-align: right;
      font-size: 9pt;
      color: #475569;
    }
    .report-meta strong {
      color: #0f172a;
    }

    /* Titre du document */
    .doc-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0284c7;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-banner h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .doc-banner p {
      font-size: 9pt;
      color: #64748b;
      margin: 0;
    }
    .count-badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 9pt;
      font-weight: 700;
      white-space: nowrap;
    }

    .filter-badge {
      font-size: 9pt;
      color: #64748b;
      background: #f1f5f9;
      padding: 6px 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      display: inline-block;
    }

    /* Tableau structuré */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 24px;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 9px 10px;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1px solid #0f172a;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .row-index {
      width: 36px;
      text-align: center;
      color: #94a3b8;
      font-weight: 600;
    }

    /* Bloc de validation / signature */
    .sign-section {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sign-box {
      width: 45%;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 16px;
      min-height: 90px;
    }
    .sign-box p {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 40px;
      text-transform: uppercase;
    }

    /* Pied de page */
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
    }

    @media print {
      body { padding: 0; }
      @page {
        size: A4 portrait;
        margin: 12mm 15mm;
      }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="brand">
      <div class="logo-badge">📁</div>
      <div class="brand-text">
        <h1>ARCHIVÉO</h1>
        <p>${orgName}</p>
      </div>
    </div>
    <div class="report-meta">
      <div>Édité le : <strong>${dateStr}</strong> à ${timeStr}</div>
      <div>Émetteur : <strong>${author}</strong></div>
      <div>Réf. document : <strong>ARC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}</strong></div>
    </div>
  </div>

  <div class="doc-banner">
    <div>
      <h2>${title}</h2>
      <p>${subtitle}</p>
    </div>
    <div class="count-badge">${data.length} enregistrement(s)</div>
  </div>

  ${filterInfo}

  <table>
    <thead>
      <tr>
        <th style="width: 36px; text-align: center;">N°</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>

  <div class="sign-section">
    <div class="sign-box">
      <p>Visa & Approbation Direction</p>
    </div>
    <div class="sign-box">
      <p>Signature Responsable Documentaire / Archives</p>
    </div>
  </div>

  <div class="footer">
    <span>Archivéo Enterprise v2.4 • Plateforme de Gestion Électronique de Documents & Archivage</span>
    <span>Document officiel généré automatiquement</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`);
  win.document.close();
}

/**
 * Export au format CSV avec encodage UTF-8 (BOM pour compatibilité Excel)
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: ExportColumn<T>[]
): void {
  if (!data || data.length === 0) return;
  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: k }));
  const header = cols.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(';');
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key as string];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      })
      .join(';')
  );
  // Ajout du BOM UTF-8 (\uFEFF) pour qu'Excel ouvre le CSV sans problème d'accents
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export au format JSON
 */
export function exportToJson<T>(data: T[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, `${filename}.json`, 'application/json');
}

/**
 * Export au format XML
 */
export function exportToXml<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  rootName = 'records'
): void {
  const escapeXml = (s: unknown) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const itemToXml = (item: T) =>
    Object.entries(item)
      .map(([k, v]) => `    <${k}>${escapeXml(v)}</${k}>`)
      .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${data
    .map((d) => `  <item>\n${itemToXml(d)}\n  </item>`)
    .join('\n')}\n</${rootName}>`;

  downloadBlob(xml, `${filename}.xml`, 'application/xml');
}

/**
 * Export Excel (.xlsx ou tableur formaté) natif et professionnel
 */
export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: ExportColumn<T>[]
): Promise<void> {
  if (!data || data.length === 0) return;
  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: k }));

  try {
    // Tentative d'utilisation de la librairie XLSX si chargée
    const XLSX = await import('xlsx');
    if (XLSX && XLSX.utils) {
      const formattedData = data.map((row, idx) => {
        const item: Record<string, unknown> = { 'N°': idx + 1 };
        cols.forEach((col) => {
          item[col.label] = row[col.key as string] ?? '';
        });
        return item;
      });

      const worksheet = XLSX.utils.json_to_sheet(formattedData);

      // Calcul automatique de la largeur des colonnes
      const colWidths = [
        { wch: 6 },
        ...cols.map((col) => {
          const maxValLen = Math.max(
            col.label.length,
            ...data.map((d) => String(d[col.key as string] ?? '').length)
          );
          return { wch: Math.min(Math.max(maxValLen + 2, 12), 45) };
        }),
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');

      XLSX.writeFile(workbook, `${filename}.xlsx`);
      return;
    }
  } catch {
    // Fallback tableur HTML compatible Excel
  }

  // Fallback universel HTML XML Excel
  const headerRow = `<th>N°</th>` + cols.map((c) => `<th>${c.label}</th>`).join('');
  const bodyRows = data
    .map(
      (row, idx) =>
        `<tr><td>${idx + 1}</td>${cols
          .map((c) => `<td>${String(row[c.key as string] ?? '')}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"/><style>
    th { background: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #000; }
    td { border: 1px solid #ccc; }
  </style></head>
  <body><table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;

  downloadBlob(html, `${filename}.xls`, 'application/vnd.ms-excel');
}

/**
 * Export PDF vectoriel haute fidélité via jsPDF & jsPDF-autotable ou rapport A4
 */
export async function exportToPdf<T extends Record<string, unknown>>(
  data: T[],
  title: string,
  columns?: ExportColumn<T>[],
  metadata?: ReportMetadata
): Promise<void> {
  if (!data || data.length === 0) return;
  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: k }));

  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    if (jsPDF) {
      const doc = new jsPDF({ orientation: cols.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

      // En-tête
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, doc.internal.pageSize.width, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ARCHIVÉO', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Plateforme de Gestion Électronique de Documents', 14, 18);

      const todayStr = new Date().toLocaleDateString('fr-FR');
      doc.text(`Édité le : ${todayStr}`, doc.internal.pageSize.width - 14, 14, { align: 'right' });

      // Titre document
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 34);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${metadata?.subtitle || 'Rapport officiel d’état des données'} — ${data.length} enregistrement(s)`,
        14,
        40
      );

      // Tableau auto-table
      const head = [['N°', ...cols.map((c) => c.label)]];
      const body = data.map((row, idx) => [
        idx + 1,
        ...cols.map((c) => String(row[c.key as string] ?? '-')),
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 46,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          font: 'helvetica',
          textColor: [30, 41, 59],
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      return;
    }
  } catch {
    // Fallback vers le moteur d'impression A4
  }

  printDataReport(data, title, columns, metadata);
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Génération de la brochure de présentation officielle Archivéo
 */
export async function exportBrochureToPdf(locale?: 'fr' | 'en' | string): Promise<void> {
  const isEn = locale === 'en';
  const data = [
    { Module: isEn ? 'Electronic Document Management (EDM)' : 'Gestion Électronique des Documents (GED)', Fonctionnalités: isEn ? 'Indexing, OCR, dynamic metadata, lifecycle, audit trail' : 'Indexation, OCR, métadonnées dynamiques, cycle de vie, traçabilité', Conformité: 'ISO 15489' },
    { Module: isEn ? 'Records Management & Lifecycle' : 'Records Management & Cycle de Vie', Fonctionnalités: isEn ? 'Current, intermediate, permanent archives, retention schedules' : 'Archives courantes, intermédiaires, définitives, tableaux de gestion, élimination certifiée', Conformité: 'ISO 20652 / OAIS' },
    { Module: isEn ? 'Approval Workflows' : 'Circuits de Validation (Workflows)', Fonctionnalités: isEn ? 'Multi-level workflows, electronic signatures, timestamped visas' : 'Workflows multi-niveaux, signatures électroniques, visas horodatés', Conformité: 'eIDAS' },
    { Module: isEn ? 'Loans & On-site Consultations' : 'Prêts, Emprunts & Consultations', Fonctionnalités: isEn ? 'Reservations, automatic reminders, physical location tracking' : 'Gestion des réservations, relances automatiques, suivi des emplacements physiques', Conformité: 'Standard' },
    { Module: isEn ? 'Security & Governance' : 'Sécurité & Gouvernance', Fonctionnalités: isEn ? 'Immutable audit log, encryption, fine-grained RBAC permissions' : 'Journal d’audit immuable, chiffrement, gestion fine des rôles et permissions RBAC', Conformité: 'RGPD / ISO 27001' },
  ];

  await exportToPdf(data, isEn ? 'Official Brochure — Archivéo Enterprise EDM & Archives' : 'Brochure Officielle — Solution Archivéo GED & Records Management', [
    { key: 'Module', label: isEn ? 'System Module' : 'Module Système' },
    { key: 'Fonctionnalités', label: isEn ? 'Key Features' : 'Fonctionnalités Clés' },
    { key: 'Conformité', label: isEn ? 'Standards & Compliance' : 'Normes & Standards' },
  ], {
    subtitle: isEn ? 'Unified Electronic Document & Regulatory Archiving Platform' : 'Plateforme unifiée de gestion électronique des documents et d’archivage réglementaire',
    organization: 'ARCHIVÉO ENTERPRISE GED & ARCHIVES',
  });
}

