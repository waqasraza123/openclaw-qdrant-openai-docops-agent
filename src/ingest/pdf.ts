import fs from "node:fs/promises";

const normalizeExtractedText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

type PdfParseResult = {
  text?: string;
  numpages?: number;
};

type PdfParseFunction = (data: Buffer) => Promise<PdfParseResult>;

const loadPdfParseFunction = async (): Promise<PdfParseFunction> => {
  const moduleValue = await import("pdf-parse");
  const candidate = (moduleValue as unknown as { default?: unknown }).default ?? moduleValue;
  if (typeof candidate !== "function") {
    throw new Error("pdf-parse module did not export a callable function");
  }
  return candidate as PdfParseFunction;
};

export const extractPdfText = async (pdfPath: string) => {
  const buffer = await fs.readFile(pdfPath);
  const pdfParseFunction = await loadPdfParseFunction();
  const parsed = await pdfParseFunction(buffer);

  const text = normalizeExtractedText(parsed.text ?? "");
  const pageCount = typeof parsed.numpages === "number" ? parsed.numpages : null;

  if (text.length === 0) {
    throw new Error("PDF extraction resulted in empty text");
  }

  return { text, pageCount };
};
