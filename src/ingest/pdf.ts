import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";

const normalizeExtractedText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const extractPdfText = async (pdfPath: string) => {
  const buffer = await fs.readFile(pdfPath);
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();
    const text = normalizeExtractedText(parsed.text ?? "");
    const pageCount = typeof parsed.total === "number" ? parsed.total : null;

    if (text.length === 0) {
      throw new Error("PDF extraction resulted in empty text");
    }

    return { text, pageCount };
  } finally {
    await parser.destroy();
  }
};
