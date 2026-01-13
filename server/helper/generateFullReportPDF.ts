import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

type ReportRow = {
  corretor: string;
  leads: number;
  repiques: number;
  total: number;
  perdidos: number;
  soma: number;
};

export async function generateFullReportPDF(
  rows: ReportRow[],
  title: string,
): Promise<string> {
  const filePath = path.join("/tmp", `relatorio-${Date.now()}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.pipe(fs.createWriteStream(filePath));

  // Título
  doc.font("Helvetica-Bold").fontSize(14).text(title, { align: "center" });
  doc.moveDown(1);

  // Layout da tabela
  const tableTop = 120;
  const left = 40;
  const rowHeight = 26;

  const cols = [
    { key: "corretor", label: "Corretor", width: 190, align: "left" as const },
    { key: "leads", label: "LEADS", width: 60, align: "center" as const },
    { key: "repiques", label: "REPIQUE", width: 70, align: "center" as const },
    { key: "total", label: "TOTAL", width: 60, align: "center" as const },
    { key: "perdidos", label: "PERDIDOS", width: 80, align: "center" as const },
    { key: "soma", label: "SOMA", width: 60, align: "center" as const },
  ];

  const tableWidth = cols.reduce((acc, c) => acc + c.width, 0);

  function drawRow(y: number, isHeader = false, row?: ReportRow) {
    // borda do retângulo da linha
    doc.rect(left, y, tableWidth, rowHeight).stroke();

    let x = left;
    for (const c of cols) {
      // borda da célula
      doc.rect(x, y, c.width, rowHeight).stroke();

      const text = isHeader ? c.label : String((row as any)[c.key] ?? "");
      doc
        .font(isHeader ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .text(text, x + 6, y + 8, {
          width: c.width - 12,
          align: c.align,
          ellipsis: true,
        });

      x += c.width;
    }
  }

  // Header
  drawRow(tableTop, true);

  // Body
  let y = tableTop + rowHeight;

  for (const r of rows) {
    // se estourar página, cria outra
    if (y + rowHeight > doc.page.height - 40) {
      doc.addPage();
      y = 60;
      drawRow(y, true);
      y += rowHeight;
    }
    drawRow(y, false, r);
    y += rowHeight;
  }

  doc.end();
  return filePath;
}
