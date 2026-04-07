const express = require('express');
const router = express.Router();
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } = require('docx');
const ExcelJS = require('exceljs');
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'generated');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Generate Word Document
router.post('/word', async (req, res) => {
  try {
    const { title, content } = req.body;
    const lines = content.split('\n').filter(l => l.trim());

    const children = [
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      ...lines.map(line => {
        const isHeading = line.startsWith('##');
        const isSubHeading = line.startsWith('#');
        const text = line.replace(/^#+\s*/, '');

        if (isHeading) {
          return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
        } else if (isSubHeading) {
          return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } });
        } else {
          return new Paragraph({
            children: [new TextRun({ text, size: 24, font: 'Calibri' })],
            spacing: { after: 120 },
            alignment: AlignmentType.JUSTIFIED
          });
        }
      })
    ];

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: 'Normal',
            name: 'Normal',
            run: { font: 'Calibri', size: 24, color: '2D2D2D' }
          }
        ]
      },
      sections: [{ children }]
    });

    const filename = `${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_')}.docx`;
    const filepath = path.join(OUTPUT_DIR, filename);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filepath, buffer);

    res.download(filepath, filename, () => fs.unlinkSync(filepath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Word generation failed' });
  }
});

// Generate Excel Spreadsheet
router.post('/excel', async (req, res) => {
  try {
    const { title, content } = req.body;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title);

    // Title row
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 40;

    // Parse content lines as data
    const lines = content.split('\n').filter(l => l.trim());
    let rowIndex = 3;

    lines.forEach((line, i) => {
      const row = sheet.getRow(rowIndex + i);
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);

      if (cols.length > 1) {
        cols.forEach((val, j) => {
          const cell = row.getCell(j + 1);
          cell.value = isNaN(val) ? val : parseFloat(val);
          if (i === 0) {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16213E' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F4FF' : 'FFFFFFFF' } };
            cell.font = { name: 'Calibri', size: 11 };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
        row.height = 25;
      } else {
        const cell = row.getCell(1);
        cell.value = line;
        cell.font = { bold: true, size: 13, color: { argb: 'FF1A1A2E' }, name: 'Calibri' };
        sheet.mergeCells(`A${rowIndex + i}:F${rowIndex + i}`);
        row.height = 30;
      }
    });

    // Auto column width
    sheet.columns.forEach(col => { col.width = 20; });

    const filename = `${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
    const filepath = path.join(OUTPUT_DIR, filename);
    await workbook.xlsx.writeFile(filepath);

    res.download(filepath, filename, () => fs.unlinkSync(filepath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Excel generation failed' });
  }
});

// Generate PowerPoint
router.post('/ppt', async (req, res) => {
  try {
    const { title, content } = req.body;
    const pres = new PptxGenJS();

    // Theme colors
    const DARK = '0D0D1A';
    const ACCENT = '6C63FF';
    const LIGHT = 'EEEEFF';
    const WHITE = 'FFFFFF';

    pres.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pres.layout = 'WIDE';

    // Title slide
    const titleSlide = pres.addSlide();
    titleSlide.background = { color: DARK };
    titleSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: ACCENT } });
    titleSlide.addShape(pres.ShapeType.rect, { x: 0, y: 6.8, w: 13.33, h: 0.08, fill: { color: ACCENT } });
    titleSlide.addText(title, {
      x: 0.5, y: 2.5, w: 12, h: 1.5,
      fontSize: 44, bold: true, color: WHITE, fontFace: 'Trebuchet MS',
      align: 'center'
    });
    titleSlide.addText('Created by DeskBuddy AI', {
      x: 0.5, y: 4.2, w: 12, h: 0.5,
      fontSize: 16, color: 'AAAACC', fontFace: 'Trebuchet MS', align: 'center'
    });

    // Content slides
    const sections = content.split('\n\n').filter(s => s.trim());
    sections.forEach(section => {
      const lines = section.split('\n').filter(l => l.trim());
      if (!lines.length) return;

      const slide = pres.addSlide();
      slide.background = { color: DARK };
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.2, fill: { color: '0A0A18' } });
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 1.2, w: 13.33, h: 0.05, fill: { color: ACCENT } });

      const heading = lines[0].replace(/^#+\s*/, '');
      slide.addText(heading, {
        x: 0.4, y: 0.15, w: 12.5, h: 1.0,
        fontSize: 28, bold: true, color: WHITE, fontFace: 'Trebuchet MS'
      });

      const bullets = lines.slice(1).map(l => ({
        text: l.replace(/^[-*•]\s*/, ''),
        options: { fontSize: 18, color: LIGHT, fontFace: 'Trebuchet MS', bullet: { type: 'number' } }
      }));

      if (bullets.length) {
        slide.addText(bullets, {
          x: 0.5, y: 1.5, w: 12.3, h: 5.5,
          valign: 'top', paraSpaceAfter: 12
        });
      }

      // Decorative dot
      slide.addShape(pres.ShapeType.ellipse, {
        x: 12.5, y: 6.8, w: 0.6, h: 0.6, fill: { color: ACCENT }, line: { color: ACCENT }
      });
    });

    const filename = `${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_')}.pptx`;
    const filepath = path.join(OUTPUT_DIR, filename);
    await pres.writeFile({ fileName: filepath });

    res.download(filepath, filename, () => fs.unlinkSync(filepath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PPT generation failed' });
  }
});

module.exports = router;
