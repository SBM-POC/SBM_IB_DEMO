// pages/pdfReader.ts
import fs from "fs";
import path from "path";
import PDFParser from "pdf2json";

export async function readPdfData(filename: string): Promise<string> {
  const pdfFilename = path.resolve(__dirname, "..", "Data", filename);

  if (!fs.existsSync(pdfFilename)) {
    throw new Error('PDF file not found at path: ${pdfFilename}');
  }

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
      const text = pdfParser.getRawTextContent();
      resolve(text);
    });

    pdfParser.loadPDF(pdfFilename);
  });
}