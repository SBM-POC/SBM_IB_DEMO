import { expect, Page, Locator, Download } from '@playwright/test';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import fs from "fs";
import path from "path";
import PDFParser from "pdf2json";

export class ReceiptHelper {
  private downloadButton: Locator;
  private downloadFolder: string;
  private statementMessage: Locator;

 constructor(private readonly page: Page) {
  this.downloadButton = page.locator('button#export_receipt');
  this.downloadFolder = path.resolve(__dirname, '..', 'Data', 'Pdf_Receipt');
  this.statementMessage = page.locator(`xpath=//app-alert-popup//p[contains(text(),'Statement exported successfully')]/../following-sibling::button//mat-icon`)
}

 async DownloadReceipt(): Promise<string> {
  await this.downloadButton.waitFor({ state: "visible" });

  const [download] = await Promise.all([
    this.page.waitForEvent("download"),
    this.downloadButton.click(),
    waitForSpinnerToDisappear(this.page),
  ]);


  await expect(this.statementMessage).toBeVisible();
  //close message
  this.statementMessage.click();

  const filename = download.suggestedFilename();
  expect(filename).toMatch(/^txndetails_\d+\.pdf$/);

  // Ensure folder exists
  if (!fs.existsSync(this.downloadFolder)) {
    fs.mkdirSync(this.downloadFolder, { recursive: true });
  }

  // Full path to save PDF
  const filePath = path.join(this.downloadFolder, filename);

  // Save and return path
  await download.saveAs(filePath);

  console.log('✅ PDF saved to: ${filePath}');
  return filePath; // <-- ✅ THIS IS THE FIX
}

async readPdfData(filename: string): Promise<string[]> {
  const pdfFilename = path.resolve(__dirname, "..", "Data", filename);

  if (!fs.existsSync(pdfFilename)) {
    throw new Error('PDF file not found at path: ${pdfFilename}');
  }

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) =>
      reject(errData.parserError)
    );

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const lines: string[] = [];

        pdfData.Pages.forEach((page: any) => {
          // Group text items by vertical Y coordinate
          const lineGroups: Record<number, any[]> = {};

          page.Texts.forEach((t: any) => {
            const y = Math.round(t.y * 10); // higher precision grouping
            const x = t.x;
            const text = decodeURIComponent(t.R.map((r: any) => r.T).join(""));

            if (!lineGroups[y]) lineGroups[y] = [];
            lineGroups[y].push({ x, text });
          });

          // Sort lines vertically (top to bottom)
          const sortedY = Object.keys(lineGroups)
            .map(Number)
            .sort((a, b) => a - b);

          // Join each line’s fragments left → right
          sortedY.forEach((y) => {
            const fragments = lineGroups[y]
              .sort((a, b) => a.x - b.x)
              .map((f) => f.text);
            const line = fragments.join(" ").replace(/\s+/g, " ").trim();
            if (line) lines.push(line);
          });

          lines.push(""); // page separator
        });

        resolve(lines);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.loadPDF(pdfFilename);
  });
}
}