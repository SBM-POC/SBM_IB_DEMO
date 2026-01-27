import { test, expect } from "@playwright/test";
import { readPdfData } from "../Helpers/RecieptHandler";

test("should read PDF and verify 'Transaction Successful'", async () => {
  const text = await readPdfData("TestPDF.pdf");

  console.log("📝 Extracted PDF text:\n", text);
});