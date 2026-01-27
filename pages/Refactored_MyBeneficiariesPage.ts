import { Page, expect } from "@playwright/test";
import { ReceiptHelper } from "../Helpers/RecieptHandler";
import { utilityLibrary } from "../Utils/utilityLibrary";
import path from "path";

export class Refactored_MyBeneficiariesPage {
  private util: utilityLibrary;

  constructor(private readonly page: Page) {
    this.util = new utilityLibrary(page);
  }

  // -------------------------------------------------------------
  // BASIC HELPERS
  // -------------------------------------------------------------

  async search(name: string) {
    const searchBox = this.page.locator("#ben_search_text");
    await searchBox.fill(name);
    await searchBox.press("Enter");
    await this.page.waitForTimeout(500);
  }

  private card(name: string) {
    return this.page
      .locator(`//mat-card[.//*[normalize-space()="${name}"]]`)
      .first();
  }

  field(label: string) {
    return this.page.locator(
      `//mat-form-field[.//mat-label[normalize-space()='${label}']]//input`
    );
  }

  selectTrigger(label: string) {
    return this.page.locator(
      `//mat-label[normalize-space()='${label}']/ancestor::mat-form-field//div[contains(@class,'mat-mdc-select-trigger')]`
    );
  }

  // -------------------------------------------------------------
  // ADD BENEFICIARY
  // -------------------------------------------------------------

  async clickAdd() {
    await this.util.clickButton(
      this.page,
      "//span[normalize-space()='Add Beneficiary']"
    );
  }

  async selectBankIdentifier(option: string) {
    await this.page.getByLabel(option, { exact: true }).check();
  }

  async typePaymentName(v: string) {
    await this.util.inputText(
      this.page,
      "//mat-form-field[.//mat-label[normalize-space()='Payment Name']]//input",
      v
    );
  }

async selectFromAccount(option: string) {
  await this.page.locator("//mat-label[normalize-space()='From Account']/ancestor::mat-form-field").click();
  await this.page.locator("//mat-option//span[contains(., '" + option + "')]").click();
}

async typeRecipientAccount(v: string) {
  await this.util.inputText(
    this.page,
    "//mat-form-field[.//mat-label[contains(.,'Recipient A/C No')]]//input",
    v
  );
}



  async typeRemarks(v: string) {
    await this.util.inputText(this.page, "#beneficiary_payment_detail", v);
  }

async selectCategory(cat: string) {
  await this.page.locator("//mat-label[contains(.,'Category')]/ancestor::mat-form-field").click();
  await this.page.locator("//mat-option//span[normalize-space()='" + cat + "']").click();
}
async typeAmount(v: string) {
  await this.util.inputText(
    this.page,
    "//mat-form-field[.//mat-label[normalize-space()='Amount']]//input",
    v
  );
}




  async save() {
    const btn = this.page
      .getByRole("button", { name: /^save$|^update$/i })
      .first();
    await btn.click();

    await this.page
      .locator(
        "simple-snack-bar, .mat-mdc-snack-bar-label, text=/success|saved|updated/i"
      )
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {});
  }

  // -------------------------------------------------------------
  // DELETE BENEFICIARY
  // -------------------------------------------------------------

  async deleteBeneficiary(name: string) {
    await this.search(name);

    const row = this.card(name);
    await row.waitFor({ state: "visible", timeout: 10000 });

    await row.locator("button[id*='menu_options_button']").click();

    await this.page.locator("//span[contains(text(),'Delete Beneficiary')]").click();
    await this.page.locator("//span[normalize-space()='Delete']").click();

    await this.page
      .locator("simple-snack-bar, text=/deleted/i")
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {});
  }

  // -------------------------------------------------------------
  // EDIT BENEFICIARY
  // -------------------------------------------------------------

  async openDetails(name: string) {
    await this.search(name);

    const row = this.card(name);
    await row.waitFor({ state: "visible" });

    await row.locator("button[id*='menu_options_button']").click();

    const menu = this.page.locator(".mat-mdc-menu-panel");
    await menu.waitFor({ state: "visible" });

    await menu.locator("#beneficiary_details_button").click();

    await this.page
      .getByRole("button", { name: /save|update/i })
      .waitFor({ state: "visible" });
  }

  async edit(name: string, fields: Record<string, any>) {
    await this.openDetails(name);

    if (fields.paymentName) await this.typePaymentName(fields.paymentName);
    if (fields.account) await this.typeRecipientAccount(fields.account);
    if (fields.amount)await this.typeAmount(fields.amount);
    if (fields.remarks) await this.typeRemarks(fields.remarks);
    if (fields.category) await this.selectCategory(fields.category);

    await this.save();
  }

  // -------------------------------------------------------------
  // MACSS (Account & IBAN)
  // -------------------------------------------------------------

  async selectTransferType(type: "Normal" | "MACSS" | "Instant") {
    await this.page.getByLabel(type, { exact: true }).check();
  }

  async setMacssIdentifier(type: "Account" | "IBAN", value: string) {
    await this.page.getByLabel(type, { exact: true }).check();

    const locator =
      type === "Account"
        ? "//mat-form-field[.//mat-label[contains(.,'A/C')]]//input"
        : "//mat-form-field[.//mat-label[contains(.,'IBAN')]]//input";

    await this.util.inputText(this.page, locator, value);
  }

  async macssAccountFlow(acc: string) {
    await this.selectTransferType("MACSS");
    await this.setMacssIdentifier("Account", acc);
  }

  async macssIbanFlow(iban: string) {
    await this.selectTransferType("MACSS");
    await this.setMacssIdentifier("IBAN", iban);
  }

  // -------------------------------------------------------------
  // SWIFT TRANSFER
  // -------------------------------------------------------------

  async selectCurrency(v: string) {
    await this.util.selectDropdown(
      this.page,
      "//mat-form-field[.//mat-label[normalize-space()='Currency']]",
      v
    );
  }

  async selectBeneficiaryCountry(v: string) {
    await this.util.selectDropdown(
      this.page,
      "//mat-form-field[.//mat-label[normalize-space()='Beneficiary Country']]",
      v
    );
  }

  async swiftFlow(data: {
    paymentName: string;
    fromAccount: string;
    currency: string;
    remittanceAmount: string;
    beneficiaryCountry: string;
    beneficiaryIban: string;
    address1: string;
    address2: string;
    address3?: string;
    beneficiaryBic: string;
    intermediaryBic: string;
    chargeOption: string;
    remarks: string;
    category: string;
  }) {
    await this.selectBankIdentifier("SWIFT Transfer");

    await this.typePaymentName(data.paymentName);
    await this.selectFromAccount(data.fromAccount);
    await this.selectCurrency(data.currency);
    await this.util.inputText(
      this.page,
      "//mat-label[normalize-space()='Remittance Amount']/ancestor::mat-form-field//input",
      data.remittanceAmount
    );

    await this.selectBeneficiaryCountry(data.beneficiaryCountry);

    await this.util.inputText(
      this.page,
      "#beneficiary_recipientaccount",
      data.beneficiaryIban
    );

    await this.util.inputText(this.page, "#beneficiary_beneficiaryAddress1", data.address1);
    await this.util.inputText(this.page, "#beneficiary_beneficiaryAddress2", data.address2);
    if (data.address3)
      await this.util.inputText(this.page, "#beneficiary_beneficiaryAddress3", data.address3);

    await this.util.inputText(
      this.page,
      "//mat-label[normalize-space()='Beneficiary Bank BIC']/ancestor::mat-form-field//input",
      data.beneficiaryBic
    );

    await this.util.clickButton(
      this.page,
      "//app-beneficiary-details-container//button//span[contains(text(),'Check')]"
    );

    await this.util.inputText(
      this.page,
      "//mat-label[normalize-space()='Intermediary Bank BIC']/ancestor::mat-form-field//input",
      data.intermediaryBic
    );

    await this.page.getByRole("button", { name: /^Check Code$/i }).last().click();

    await this.util.selectDropdown(
      this.page,
      "//mat-label[normalize-space()='Charge Option']/ancestor::mat-form-field",
      data.chargeOption
    );

    await this.typeRemarks(data.remarks);
    await this.selectCategory(data.category);

    await this.save();
  }

  // -------------------------------------------------------------
  // QUICK PAY
  // -------------------------------------------------------------

  async enableQuickPay(name: string) {
    await this.search(name);

    const row = this.card(name);
    await row.waitFor({ state: "visible" });

    const toggle = row.locator('button[id*="quick_pay_toggle"]').first();
    const state = await toggle.getAttribute("aria-checked");

    if (state !== "true") {
      await toggle.click({ force: true });
      await this.page.waitForTimeout(300);
    }
  }

async findQuickPayCard(name: string) {
  return this.page
    .locator(`//div[contains(@class,'beneficiary-card')]//*[normalize-space()='${name}']/ancestor::div[contains(@class,'beneficiary-card')]`)
    .first();
}



async quickPay(name: string, amount?: string) {
  const card = await this.findQuickPayCard(name);

  await card.waitFor({ state: "visible", timeout: 10000 });
  await card.scrollIntoViewIfNeeded();

  // (If later you need to type amount somewhere, you can do it here using `amount`.)

  await card.locator("mat-slide-toggle").click();
}



  async confirmQuickPay() {
    const dlg = this.page
      .locator("mat-dialog-container")
      .filter({ hasText: /Confirm Transaction/i })
      .first();

    await dlg.waitFor({ state: "visible", timeout: 15000 });

    await dlg.getByRole("button", { name: /^Confirm$/i }).click();

    await this.page
      .locator(
        "simple-snack-bar, .mat-mdc-snack-bar-label, text=/success|completed|reference/i"
      )
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
  }


  async verifyQuickPayConfirmModal(fromAcc: string, toAcc: string, amount: string, payDate: string, remarks: string) {

  const modal = this.page.locator("//app-confirm-transaction-dialog | //div[contains(@class,'confirm-transaction')]");

  await modal.waitFor({ state: "visible" });

  await expect(modal.getByText(fromAcc)).toBeVisible();
  await expect(modal.getByText(toAcc)).toBeVisible();
  await expect(modal.getByText(amount)).toBeVisible();
  await expect(modal.getByText(payDate)).toBeVisible();
  await expect(modal.getByText(remarks)).toBeVisible();
}

async verifyQuickPaySuccessModal(fromAcc: string, toAcc: string, amount: string, currency: string, date: string, remarks: string) {

  const modal = this.page.locator("//app-transfer-success-dialog | //div[contains(@class,'success')]");

  await modal.waitFor({ state: "visible" });

  await expect(modal.getByText(fromAcc)).toBeVisible();
  await expect(modal.getByText(toAcc)).toBeVisible();
  await expect(modal.getByText(amount)).toBeVisible();
  await expect(modal.getByText(currency)).toBeVisible();
  await expect(modal.getByText(date)).toBeVisible();
  await expect(modal.getByText(remarks)).toBeVisible();

  // Extract Reference ID (eBanking Reference)
  const refText = await modal.locator("text=/reference/i").innerText();
  return refText.replace(/[^\d]/g, ""); // return clean numeric reference
}

async mask(account: string) {
  if (!account) return "";
  // Keep last 4 digits only → ***000265
  return account.replace(/\d(?=\d{4})/g, "*");
}


async formatDateDDMMYYYY(dateString: string) {
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}


async verifyQuickPayReceipt(
  maskedFrom: string,
  maskedTo: string,
  formattedDate: string,
  amount: string,
  currency: string,
  remarks: string,
  refId: string
) {

  const receipt = new ReceiptHelper(this.page);

  // ---------------- DOWNLOAD PDF ----------------
  const pdfFullPath = await receipt.DownloadReceipt();

  // Extract only the filename (example: txndetails_123456.pdf)
  const filename = pdfFullPath.split(path.sep).pop();

  // ---------------- READ PDF ----------------
  const pdfLines = await receipt.readPdfData(filename!);
  const content = pdfLines.join(" ");

  const expectDetail = async (text: string) => {
    try {
      expect(content).toContain(text);
    } catch {
      throw new Error(`❌ Receipt missing expected text: ${text}`);
    }
  };

  // ---------------- ASSERT RECEIPT CONTENT ----------------
  await expectDetail("Remittance Advice");
  await expectDetail("Transaction Successful");
  await expectDetail(maskedFrom);
  await expectDetail(maskedTo);
  await expectDetail(`${currency} ${amount}`);
  await expectDetail(formattedDate);
  await expectDetail(remarks);
  await expectDetail(refId);
}
async getBankIdentifierOptions(): Promise<string[]> {
  return this.page.locator("mat-option .mdc-list-item__primary-text")
    .allTextContents();
}

async getTransferTypeOptions(): Promise<string[]> {
  return this.page.locator("mat-radio-button span.mdc-label")
    .allTextContents();
}

async selectChargeOption(value: string) {
  await this.util.selectDropdown(
    this.page,
    "//mat-label[normalize-space()='Charge Option']/ancestor::mat-form-field",
    value
  );
}

}
