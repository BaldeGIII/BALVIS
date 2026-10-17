// Generates Word, PowerPoint, Excel and PDF files from structured content the agent supplies.
const fs = require('node:fs');
const {
  AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} = require('docx');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const PptxGenJS = require('pptxgenjs');
const workspace = require('./workspace');

const str = (value) => String(value ?? '').trim();
const list = (value, max = 500) => (Array.isArray(value) ? value.slice(0, max).map(str).filter(Boolean) : []);
const rows = (table) => ({
  headers: list(table?.headers, 30),
  rows: (Array.isArray(table?.rows) ? table.rows.slice(0, 500) : []).map((row) => (Array.isArray(row) ? row.map(str) : [])),
});

// ---- Word ----

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

function docxTable({ headers, rows: body }) {
  const cell = (text, bold) =>
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ...(headers.length ? [new TableRow({ children: headers.map((h) => cell(h, true)) })] : []),
      ...body.map((row) => new TableRow({ children: row.map((c) => cell(c, false)) })),
    ],
  });
}

async function buildDocx({ title, subtitle, sections, references }) {
  const children = [];
  if (title) children.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }));
  if (subtitle) children.push(new Paragraph({ children: [new TextRun({ text: subtitle, italics: true })], spacing: { after: 240 } }));

  for (const section of sections) {
    if (section.heading) {
      children.push(new Paragraph({ text: section.heading, heading: HEADINGS[Math.min(Math.max((section.level || 1) - 1, 0), 2)] }));
    }
    list(section.paragraphs).forEach((p) => children.push(new Paragraph({ text: p, spacing: { after: 160 } })));
    list(section.bullets).forEach((b) => children.push(new Paragraph({ text: b, bullet: { level: 0 } })));
    if (section.table) {
      const table = rows(section.table);
      if (table.rows.length || table.headers.length) children.push(docxTable(table), new Paragraph(''));
    }
  }

  if (references.length) {
    children.push(new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_1 }));
    references.forEach((r) => children.push(new Paragraph({ text: r, spacing: { after: 100 } })));
  }

  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

// ---- PowerPoint ----

const NAVY = '07182A';
const CYAN = '36D6FF';
const ORANGE = 'FF9B3D';
const TEXT = 'D6F4FF';

async function buildPptx({ title, subtitle, slides }) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.title = title || 'Presentation';

  const first = pptx.addSlide();
  first.background = { color: NAVY };
  first.addShape(pptx.ShapeType.rect, { x: 0.8, y: 3.55, w: 2.2, h: 0.07, fill: { color: ORANGE } });
  first.addText(title || 'Presentation', { x: 0.8, y: 1.6, w: 11.7, h: 1.8, fontSize: 40, bold: true, color: CYAN, fontFace: 'Calibri', valign: 'bottom' });
  if (subtitle) first.addText(subtitle, { x: 0.8, y: 3.8, w: 11.7, h: 1.2, fontSize: 20, color: TEXT, fontFace: 'Calibri', valign: 'top' });

  for (const spec of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: NAVY };
    slide.addText(str(spec.title), { x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontSize: 30, bold: true, color: CYAN, fontFace: 'Calibri' });
    slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.25, w: 1.4, h: 0.05, fill: { color: ORANGE } });

    const bullets = list(spec.bullets, 12);
    const table = spec.table ? rows(spec.table) : null;
    const tableRows = table && (table.headers.length || table.rows.length);

    if (bullets.length) {
      const size = bullets.length > 8 ? 16 : bullets.length > 5 ? 19 : 22;
      slide.addText(
        bullets.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
        { x: 0.7, y: 1.5, w: tableRows ? 5.6 : 11.9, h: 5.2, fontSize: size, color: TEXT, fontFace: 'Calibri', valign: 'top', paraSpaceAfter: 8 }
      );
    }
    if (tableRows) {
      const body = [
        ...(table.headers.length ? [table.headers.map((text) => ({ text, options: { bold: true, color: NAVY, fill: { color: CYAN } } }))] : []),
        ...table.rows.map((row) => row.map((text) => ({ text, options: { color: TEXT } }))),
      ];
      slide.addTable(body, {
        x: bullets.length ? 6.6 : 0.7, y: 1.6, w: bullets.length ? 6.1 : 11.9,
        fontSize: 14, fontFace: 'Calibri', border: { type: 'solid', color: '2A5570', pt: 0.5 },
      });
    }
    if (spec.notes) slide.addNotes(str(spec.notes));
    slide.addText('BALVIS', { x: 11.6, y: 7.0, w: 1.2, h: 0.3, fontSize: 10, color: '5C8AA3', align: 'right' });
  }

  return pptx.write({ outputType: 'nodebuffer' });
}

// ---- Excel ----

async function buildXlsx({ sheets }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BALVIS';
  sheets.forEach((spec, index) => {
    const sheet = workbook.addWorksheet(str(spec.name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Sheet${index + 1}`);
    const headers = list(spec.headers, 100);
    if (headers.length) {
      const header = sheet.addRow(headers);
      header.font = { bold: true };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }
    (Array.isArray(spec.rows) ? spec.rows.slice(0, 5000) : []).forEach((row) => {
      if (Array.isArray(row)) sheet.addRow(row.map((cell) => (typeof cell === 'number' ? cell : str(cell))));
    });
    sheet.columns.forEach((column) => {
      let width = 8;
      column.eachCell({ includeEmpty: false }, (cell) => (width = Math.max(width, Math.min(60, String(cell.value ?? '').length + 2))));
      column.width = width;
    });
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ---- PDF ----

function buildPdf({ title, subtitle, sections, references }) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    if (title) pdf.font('Helvetica-Bold').fontSize(22).text(title).moveDown(0.3);
    if (subtitle) pdf.font('Helvetica-Oblique').fontSize(12).fillColor('#555').text(subtitle).fillColor('#000').moveDown();

    const block = (section) => {
      if (section.heading) {
        const size = [16, 13.5, 12][Math.min(Math.max((section.level || 1) - 1, 0), 2)];
        pdf.moveDown(0.5).font('Helvetica-Bold').fontSize(size).text(section.heading).moveDown(0.2);
      }
      list(section.paragraphs).forEach((p) => pdf.font('Helvetica').fontSize(11).text(p, { lineGap: 2 }).moveDown(0.5));
      list(section.bullets).forEach((b) => pdf.font('Helvetica').fontSize(11).text(`•  ${b}`, { indent: 10, lineGap: 2 }));
      if (section.table) {
        const table = rows(section.table);
        [table.headers, ...table.rows].filter((r) => r.length).forEach((r, i) =>
          pdf.font(i === 0 && table.headers.length ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).text(r.join('   |   '))
        );
        pdf.moveDown();
      }
    };
    sections.forEach(block);
    if (references.length) block({ heading: 'References', paragraphs: references });

    const { count } = pdf.bufferedPageRange();
    for (let i = 0; i < count; i++) {
      pdf.switchToPage(i);
      pdf.page.margins.bottom = 0; // writing in the bottom margin would otherwise add a new page
      pdf.font('Helvetica').fontSize(9).fillColor('#777').text(`${i + 1} / ${count}`, 56, 800, { align: 'center', width: 483 });
    }
    pdf.end();
  });
}

// ---- Entry points ----

const BUILDERS = { docx: buildDocx, pptx: buildPptx, xlsx: buildXlsx, pdf: buildPdf };

async function createDocument(input) {
  const format = str(input.format).toLowerCase();
  const build = BUILDERS[format];
  if (!build) throw new Error(`Unsupported format "${input.format}". Use docx, pptx, xlsx or pdf.`);

  const spec = {
    title: str(input.title),
    subtitle: str(input.subtitle),
    sections: (Array.isArray(input.sections) ? input.sections.slice(0, 200) : []).filter((s) => s && typeof s === 'object'),
    slides: (Array.isArray(input.slides) ? input.slides.slice(0, 60) : []).filter((s) => s && typeof s === 'object'),
    sheets: (Array.isArray(input.sheets) ? input.sheets.slice(0, 20) : []).filter((s) => s && typeof s === 'object'),
    references: list(input.references, 200),
  };

  const empty =
    (format === 'pptx' && spec.slides.length === 0) ||
    (format === 'xlsx' && spec.sheets.length === 0) ||
    ((format === 'docx' || format === 'pdf') && spec.sections.length === 0 && !spec.title);
  if (empty) throw new Error(`The ${format} had no content (slides, sections or sheets are required).`);

  const buffer = await build(spec);
  const file = workspace.uniquePath(workspace.ensure(), workspace.safeName(input.filename || spec.title || 'document', format));
  fs.writeFileSync(file, buffer);
  return { name: require('node:path').basename(file), bytes: buffer.length };
}

// Plain-text formats only: nothing that could be executed by double-clicking it.
const TEXT_EXTENSIONS = new Set(['md', 'txt', 'html', 'htm', 'csv', 'tsv', 'json', 'tex', 'bib', 'py', 'js', 'ts', 'css', 'yaml', 'yml', 'xml', 'svg', 'srt', 'vtt', 'rtf', 'ipynb', 'r', 'sql']);

function writeTextFile({ filename, content }) {
  const name = workspace.safeName(filename, 'txt');
  const ext = name.split('.').pop().toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) throw new Error(`".${ext}" files are not allowed. Allowed: ${[...TEXT_EXTENSIONS].join(', ')}.`);
  const file = workspace.uniquePath(workspace.ensure(), name);
  fs.writeFileSync(file, String(content ?? ''), 'utf8');
  return { name: require('node:path').basename(file), bytes: Buffer.byteLength(String(content ?? '')) };
}

module.exports = { createDocument, writeTextFile };
