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
 * Génération de la brochure de présentation officielle Archivéo (Document multi-pages riche)
 */
export async function exportBrochureToPdf(locale?: 'fr' | 'en' | string): Promise<void> {
  const isEn = locale === 'en';
  
  const win = window.open('', '_blank', 'width=1000,height=850');
  if (!win) {
    throw new Error('Veuillez autoriser les pop-ups');
  }

  win.document.write(`<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'fr'}">
<head>
  <meta charset="UTF-8">
  <title>${isEn ? 'Archivéo Enterprise — Product Brochure' : 'Archivéo Enterprise — Brochure Commerciale Officielle'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 20mm;
      margin: 0 auto 10mm auto;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      font-size: 22pt;
    }
    .brand-title {
      font-size: 16pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-tag {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    /* Cover Page Styling */
    .cover-hero {
      margin: auto 0;
      text-align: center;
      padding: 30px 10px;
    }
    .cover-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0284c7;
      font-weight: 700;
      font-size: 10pt;
      padding: 6px 16px;
      border-radius: 20px;
      margin-bottom: 24px;
      border: 1px solid #bae6fd;
    }
    .cover-title {
      font-size: 34pt;
      font-weight: 800;
      line-height: 1.15;
      color: #0f172a;
      letter-spacing: -1px;
      margin-bottom: 16px;
    }
    .cover-title span {
      color: #2563eb;
    }
    .cover-subtitle {
      font-size: 13pt;
      color: #475569;
      max-width: 600px;
      margin: 0 auto 36px auto;
      line-height: 1.6;
    }
    .cover-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 40px;
      text-align: left;
    }
    .cover-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
    }
    .cover-card-icon {
      font-size: 20pt;
      margin-bottom: 8px;
    }
    .cover-card-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .cover-card-desc {
      font-size: 8.5pt;
      color: #64748b;
      line-height: 1.4;
    }

    /* Module Pages Styling */
    .module-title-box {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .module-num {
      font-size: 24pt;
      font-weight: 800;
      opacity: 0.3;
    }
    .module-h2 {
      font-size: 15pt;
      font-weight: 800;
    }
    .module-tagline {
      font-size: 9pt;
      color: #94a3b8;
      margin-top: 2px;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .feat-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
    }
    .feat-item h4 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .feat-item p {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.45;
    }
    .highlight-banner {
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 10px;
      padding: 14px 18px;
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .highlight-text h5 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e3a8a;
    }
    .highlight-text p {
      font-size: 8pt;
      color: #3b82f6;
    }
    .norm-badge {
      background: #2563eb;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .page-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #94a3b8;
      font-weight: 500;
    }

    @media print {
      body { background: #ffffff; }
      .page {
        box-shadow: none;
        margin: 0;
        padding: 15mm 18mm;
        width: 100%;
        min-height: 100vh;
      }
    }
  </style>
</head>
<body>

  <!-- PAGE 1 : COUVERTURE OFFICIELLE -->
  <div class="page">
    <div class="page-header">
      <div class="brand">
        <span class="logo-icon">📁</span>
        <div>
          <div class="brand-title">ARCHIVÉO</div>
          <div class="brand-tag">Enterprise GED & Records Management</div>
        </div>
      </div>
      <span class="header-badge">Édition 2026 • v2.4</span>
    </div>

    <div class="cover-hero">
      <span class="cover-badge">⚡ Plateforme Unifiée & 100% Souveraine</span>
      <h1 class="cover-title">La Nouvelle Référence de la <span>GED & des Archives</span></h1>
      <p class="cover-subtitle">
        Gestion électronique de documents, cartographie topographique des magasins physiques, OCR DeepScan, signatures WhatsApp et records management réglementaire ISO 15489.
      </p>

      <div class="cover-grid">
        <div class="cover-card">
          <div class="cover-card-icon">📄</div>
          <div class="cover-card-title">GED & Visionneuse HD</div>
          <div class="cover-card-desc">Visualisation in-app, rotation 90°, métadonnées et contrôle de conformité.</div>
        </div>
        <div class="cover-card">
          <div class="cover-card-icon">🏢</div>
          <div class="cover-card-title">Topographie Physique</div>
          <div class="cover-card-desc">Localisation rayonnages et impression de planches d'étiquettes QR Codes A4.</div>
        </div>
        <div class="cover-card">
          <div class="cover-card-icon">✍️</div>
          <div class="cover-card-title">Parapheur WhatsApp</div>
          <div class="cover-card-desc">Signatures probantes eIDAS avec invitations directes par message WhatsApp.</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise Solution • https://app.archiveo.enterprise</span>
      <span>Page 1 / 10</span>
    </div>
  </div>

  <!-- PAGE 2 : MODULE GED & VISIONNEUSE -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module GED</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">1. Gestion Électronique des Documents (GED)</h2>
          <p class="module-tagline">Centralisation, indexation multi-critères et visionneuse vectorielle in-app</p>
        </div>
        <span class="module-num">01</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>👁️ Visionneuse In-App Intégrée</h4>
          <p>Affichage fluide de tous types de documents (PDF, TIFF, Word, Tableurs, Images) sans outil tiers. Zoom précis de 50% à 250%, rotation à 90° et mode plein écran centré.</p>
        </div>
        <div class="feat-item">
          <h4>🏷️ Indexation Métadonnées Riche</h4>
          <p>Attribution automatique de références légales uniques, classement par type, catégorie, service émetteur, mots-clés et niveau de confidentialité strict.</p>
        </div>
        <div class="feat-item">
          <h4>🔄 Cycle de Vie & Versioning</h4>
          <p>Gestion rigoureuse des états (Brouillon, En révision, Validé, Archivé, Obsolète) et historique complet des versions avec traçabilité intégrale de l'auteur.</p>
        </div>
        <div class="feat-item">
          <h4>🔒 Sécurité & Contrôle d'Accès</h4>
          <p>Droits de consultation, téléchargement et modification segmentés par rôle RBAC (Admin, Records Manager, Utilisateur métier).</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Norme Documentaire Internationale</h5>
        <p>Conforme aux prérequis de classement et traçabilité ISO 15489-1</p>
      </div>
      <span class="norm-badge">ISO 15489</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 01 GED</span>
      <span>Page 2 / 10</span>
    </div>
  </div>

  <!-- PAGE 3 : TOPOGRAPHIE & ÉTIQUETTES QR -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module Topographie</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">2. Topographie des Magasins & Étiquettes QR</h2>
          <p class="module-tagline">Cartographie physique précise des dépôts et étiquetage intelligent</p>
        </div>
        <span class="module-num">02</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>🏢 Arborescence Spatiale Complète</h4>
          <p>Organisation hiérarchique : Bâtiment / Site > Magasin / Salle > Travée / Rayon > Étagère / Tablette > Carton d'archives, 100% paramétrable.</p>
        </div>
        <div class="feat-item">
          <h4>🏷️ Planches QR Codes & Code-barres</h4>
          <p>Génération instantanée de planches d'étiquettes A4 avec repères de découpe, références scannables et étiquettes adhésives individuelles pour cartons.</p>
        </div>
        <div class="feat-item">
          <h4>⏳ Suivi des Échéances de Conservation</h4>
          <p>Indication visible de l'année d'échéance de conservation (DUA) sur chaque boîte pour planifier les versements ou éliminations réglementaires.</p>
        </div>
        <div class="feat-item">
          <h4>📊 Jauges d'Occupation en Temps Réel</h4>
          <p>Visualisation des capacités restantes par salle pour optimiser l'espace de stockage physique des archives d'entreprise.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Pont Physique & Numérique</h5>
        <p>Retrouvez un dossier physique en moins de 30 secondes grâce au code topographique</p>
      </div>
      <span class="norm-badge">TRAÇABILITÉ TOTALE</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 02 Topographie</span>
      <span>Page 3 / 10</span>
    </div>
  </div>

  <!-- PAGE 4 : OCR PLEIN TEXTE -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module OCR</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">3. Moteur OCR DeepScan & Recherche Plein Texte</h2>
          <p class="module-tagline">Numérisation haute fidélité et indexation intégrale du texte</p>
        </div>
        <span class="module-num">03</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>🔍 Reconnaissance Optique de Caractères</h4>
          <p>Moteur d'extraction OCR multilingue capable d'extraire le texte intégral des scans, factures, contrats manuscrits ou dactylographiés avec score de confiance.</p>
        </div>
        <div class="feat-item">
          <h4>⚡ Index Inversé Plein Texte Ultra-Rapide</h4>
          <p>Indexation automatique du contenu textuel permettant des recherches instantanées sur des millions de pages sans ralentissement.</p>
        </div>
        <div class="feat-item">
          <h4>✨ Surbrillance Contextuelle</h4>
          <p>Mise en valeur visuelle immédiate (fond jaune) de chaque terme recherché dans le texte avec affichage des extraits pertinents.</p>
        </div>
        <div class="feat-item">
          <h4>🤖 Synthèse Automatique par IA</h4>
          <p>Génération de résumés documentaires automatiques et extraction des mots-clés stratégiques pour accélérer la prise de décision.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Moteur DeepScan v2.4</h5>
        <p>Taux de reconnaissance supérieur à 98.7% sur documents administratifs</p>
      </div>
      <span class="norm-badge">DEEPSCAN AI</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 03 OCR & Recherche</span>
      <span>Page 4 / 10</span>
    </div>
  </div>

  <!-- PAGE 5 : PARAPHEUR WHATSAPP -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module Signatures</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">4. Parapheur Électronique & Alertes WhatsApp</h2>
          <p class="module-tagline">Signature probante conforme eIDAS avec canal WhatsApp instantané</p>
        </div>
        <span class="module-num">04</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>📱 Notifications WhatsApp Directes</h4>
          <p>Envoi de l'invitation à signer directement sur WhatsApp avec lien sécurisé pour une signature rapide sur smartphone ou tablette.</p>
        </div>
        <div class="feat-item">
          <h4>🔒 Scellement Cryptographique eIDAS</h4>
          <p>Calcul d'empreinte SHA-256 unique, certificat numérique probant, horodatage certifié et vérification de l'adresse IP du signataire.</p>
        </div>
        <div class="feat-item">
          <h4>🔢 Protection par Code PIN Personnel</h4>
          <p>Code confidentiel à 4 chiffres exigé pour chaque signataire garantissant l'authenticité et le consentement irrévocable.</p>
        </div>
        <div class="feat-item">
          <h4>📜 Certificat d'Authenticité Téléchargeable</h4>
          <p>Génération de la fiche de preuve légale avec QR Code d'intégrité pour contrôle par un auditeur ou une autorité juridique.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Conformité Juridique Européenne & Africaine</h5>
        <p>Valeur probante équivalente à la signature manuscrite selon le règlement eIDAS</p>
      </div>
      <span class="norm-badge">eIDAS / RGS</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 04 Signatures</span>
      <span>Page 5 / 10</span>
    </div>
  </div>

  <!-- PAGE 6 : RECORDS MANAGEMENT -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module Records Management</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">5. Conservation Réglementaire & Records Management</h2>
          <p class="module-tagline">Gouvernance des 3 âges d'archives, DUA et destruction certifiée</p>
        </div>
        <span class="module-num">05</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>🏛️ Cycle des 3 Âges (ISO 15489 / OAIS)</h4>
          <p>Gestion rigoureuse des archives courantes (bureaux), intermédiaires (dépôt) et définitives (fonds patrimonial historique).</p>
        </div>
        <div class="feat-item">
          <h4>⏱️ Tableaux de Gestion & DUA</h4>
          <p>Application automatisée des Durées d'Utilité Administrative selon la législation nationale et le référentiel sectoriel de l'entreprise.</p>
        </div>
        <div class="feat-item">
          <h4>📋 Bordereaux de Versement</h4>
          <p>Transfert formel des dossiers des services producteurs vers le service des archives avec récépissé officiel et signature des parties.</p>
        </div>
        <div class="feat-item">
          <h4>🔥 Élimination & Destruction Certifiée</h4>
          <p>Procédure contradictoire de destruction après visa juridique avec certificat officiel de destruction conservé à titre perpétuel.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Normes Internationales d'Archivage</h5>
        <p>Aligné sur le modèle de référence OAIS (ISO 14721) et NF Z42-013</p>
      </div>
      <span class="norm-badge">OAIS / ISO 14721</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 05 Records Management</span>
      <span>Page 6 / 10</span>
    </div>
  </div>

  <!-- PAGE 7 : WORKFLOWS & MODÈLES -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module Workflows</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">6. Circuits de Validation & Modèles Types</h2>
          <p class="module-tagline">Workflows séquentiels automatisés et validation groupée par type documentaire</p>
        </div>
        <span class="module-num">06</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>📑 Validation en Masse par Type</h4>
          <p>Circuits établis automatiquement par nature de pièce (Contrats, Factures, Courriers). Les approbateurs sélectionnent et valident plusieurs dossiers en 1 clic.</p>
        </div>
        <div class="feat-item">
          <h4>✨ Modèles Types Réutilisables</h4>
          <p>Bibliothèque de circuits prédéfinis (Standard GED, Engagements financiers, Élimination d'archives) modifiables sans code.</p>
        </div>
        <div class="feat-item">
          <h4>🔔 Notifications par Rôle Métier</h4>
          <p>Bandeaux d'alertes dynamiques sur le tableau de bord informant chaque acteur des visas en attente sur son profil.</p>
        </div>
        <div class="feat-item">
          <h4>📈 Traçabilité & Commentaires</h4>
          <p>Historique horodaté des visas accordés ou refusés avec motifs explicatifs consignés dans le journal d'audit.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Gain de Temps Opérationnel</h5>
        <p>Réduction de 70% du temps de traitement des circuits d'approbation d'entreprise</p>
      </div>
      <span class="norm-badge">PRODUCTIVITÉ +70%</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 06 Workflows</span>
      <span>Page 7 / 10</span>
    </div>
  </div>

  <!-- PAGE 8 : COURRIERS & FLUX -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module Courriers</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">7. Registre des Courriers & Gestion des Flux</h2>
          <p class="module-tagline">Traçabilité légale des correspondances entrantes, sortantes et internes</p>
        </div>
        <span class="module-num">07</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>✉️ Registre Chronologique Légal</h4>
          <p>Attribution d'une référence officielle infalsifiable (ex: CR-IN-2024-001) avec horodatage certifié dès l'arrivée au bureau d'ordre.</p>
        </div>
        <div class="feat-item">
          <h4>👥 Répertoires Paramétrables</h4>
          <p>Gestion des expéditeurs et destinataires internes et externes (Direction Générale, DAF, DRH, Administrations, Partenaires).</p>
        </div>
        <div class="feat-item">
          <h4>📎 Rapprochement Documentaire</h4>
          <p>Liaison directe entre la fiche de courrier et la pièce numérisée dans la GED pour un accès immédiat en 1 clic.</p>
        </div>
        <div class="feat-item">
          <h4>🖨️ Fiche de Courrier A4 Individuelle</h4>
          <p>Impression de la fiche d'enregistrement et du bordereau de transmission pour la circulation physique des pièces.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Zéro Courrier Égaré</h5>
        <p>Suivi en temps réel des délais de réponse et des imputations par direction</p>
      </div>
      <span class="norm-badge">BUREAU D'ORDRE</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 07 Courriers</span>
      <span>Page 8 / 10</span>
    </div>
  </div>

  <!-- PAGE 9 : PRÊTS & CONSULTATIONS -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Module Prêts</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">8. Prêts, Emprunts & Consultations Traçables</h2>
          <p class="module-tagline">Contrôle strict des mouvements physiques et réintégrations en magasin</p>
        </div>
        <span class="module-num">08</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>📖 Gestion des Sorties Physiques</h4>
          <p>Enregistrement des demandes de prêt avec motif, nom de l'emprunteur, service et date limite de restitution.</p>
        </div>
        <div class="feat-item">
          <h4>🔄 Prolongation & Relances</h4>
          <p>Prolongation rapide en 1 clic et alertes automatiques des prêts arrivant à échéance ou en retard.</p>
        </div>
        <div class="feat-item">
          <h4>✅ Modal de Réintégration Sécurisé</h4>
          <p>Validation du retour physique en magasin avec confirmation modale et mise à jour immédiate de la topographie.</p>
        </div>
        <div class="feat-item">
          <h4>👁️ Registre des Consultations sur Place</h4>
          <p>Consignation des consultations sans sortie de magasin pour les documents confidentiels ou historiques fragiles.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Sécurité & Intégrité du Fonds</h5>
        <p>Historique complet des mains par lesquelles chaque document est passé</p>
      </div>
      <span class="norm-badge">SÉCURITÉ PHYSIQUE</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Module 08 Prêts</span>
      <span>Page 9 / 10</span>
    </div>
  </div>

  <!-- PAGE 10 : SÉCURITÉ, PARAMÉTRAGE & DÉPLOIEMENT -->
  <div class="page">
    <div class="page-header">
      <div class="brand"><span class="logo-icon">📁</span><span class="brand-title">ARCHIVÉO</span></div>
      <span class="header-badge">Architecture & Sécurité</span>
    </div>

    <div>
      <div class="module-title-box">
        <div>
          <h2 class="module-h2">9. Sécurité, Paramétrage Sans Code & Déploiement</h2>
          <p class="module-tagline">Architecture souveraine, 56 groupes éditables et conformité RGPD</p>
        </div>
        <span class="module-num">10</span>
      </div>

      <div class="feature-grid">
        <div class="feat-item">
          <h4>⚙️ Dictionnaire 100% Sans Code</h4>
          <p>56 groupes de paramètres système (Types, Catégories, Rôles, Pays, Magasins, Services) éditables en temps réel sans développeur.</p>
        </div>
        <div class="feat-item">
          <h4>🛡️ Sécurité de Niveau Bancaire</h4>
          <p>Chiffrement AES-256, hachage PBKDF2/SHA-512, protection anti-brute force, sessions temporisées et journal d'audit immuable.</p>
        </div>
        <div class="feat-item">
          <h4>🌐 Centre d'Import / Export Universel</h4>
          <p>Interopérabilité totale : Export en Excel (.xlsx), PDF vectoriel A4, CSV UTF-8, JSON, XML et impression directe sur toutes les pages.</p>
        </div>
        <div class="feat-item">
          <h4>🚀 Déploiement Souverain</h4>
          <p>Disponible en mode On-Premise (serveurs locaux entreprise), Cloud Privé Souverain ou Architecture Hybride.</p>
        </div>
      </div>
    </div>

    <div class="highlight-banner">
      <div class="highlight-text">
        <h5>Contact & Démonstration Personnalisée</h5>
        <p>Email : contact@archiveo.enterprise • Web : https://app.archiveo.enterprise</p>
      </div>
      <span class="norm-badge">SUPPORT ENTREPRISE</span>
    </div>

    <div class="page-footer">
      <span>Archivéo Enterprise • Solution Globale v2.4</span>
      <span>Page 10 / 10</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`);
  win.document.close();
}

