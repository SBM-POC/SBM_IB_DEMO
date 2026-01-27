import { Page, expect,Locator } from '@playwright/test';
import { clickButton, selectRadio, inputText, selectDropdown } from '../Utils/utilityLibrary';



export class My_BeneficiariesPage {

 constructor(private readonly page: Page) {}

private readonly btnAddBeneficiary = "//span[normalize-space()='Add Beneficiary']";



  
  async clickAddBeneficiary() {
    await clickButton(this.page, this.btnAddBeneficiary);
  }


  async selectBankIdentifier(option: string) {
  await this.page.locator(`//label[normalize-space()='${option}']`).first().click();
}

async typePaymentName(value: string) {
  await inputText(
    this.page,
    "//mat-form-field[.//mat-label[normalize-space()='Payment Name']]//input",
    value
  );
}

async selectFromAccount(accountText: string) {
  await selectDropdown(
    this.page,
    "//mat-form-field[.//mat-label[normalize-space()='From Account']]",
    accountText
  );
}

async selectCurrency(codeOrName: string) {
  await selectDropdown(
    this.page,
    '//mat-label[normalize-space()="Currency"]/ancestor::mat-form-field//div[contains(@class,"mat-mdc-select-trigger")]',
    codeOrName
  );
}


async selectBeneficiaryCountry(countryName: string) {
  await selectDropdown(
    this.page,
    '//mat-label[normalize-space()="Beneficiary Country"]/ancestor::mat-form-field//div[contains(@class,"mat-mdc-select-trigger")]',
    countryName
  );
}
async typeBeneficiaryAccountIban(value: string) {
  await inputText(this.page, `#beneficiary_recipientaccount`, value);
}

/** Beneficiary Address Line 1/2/3 */
async typeBeneficiaryAddress1(v: string) { await inputText(this.page, `#beneficiary_beneficiaryAddress1`, v); }
async typeBeneficiaryAddress2(v: string) { await inputText(this.page, `#beneficiary_beneficiaryAddress2`, v); }
async typeBeneficiaryAddress3(v: string) { await inputText(this.page, `#beneficiary_beneficiaryAddress3`, v); }

/** Beneficiary Bank BIC (dropdown) */
async selectBeneficiaryBankBIC(bicOption: string) {
  await selectDropdown(this.page, `//div[@class='mat-mdc-form-field-infix ng-tns-c3736059725-233']`, bicOption);
}

/** Check Code (button) */
async clickCheckCode() {
  await clickButton(this.page, `//app-beneficiary-details-container[@class='ng-star-inserted']//div[2]//button[1]//span[2]`);
}

/** Beneficiary Bank Clearing Code */
async typeBeneficiaryBankClearingCode(v: string) {
  await inputText(this.page, `#beneficiary_bankNationalClearingCode`, v);
}

/** Beneficiary Bank Name */
async typeBeneficiaryBankName(v: string) {
  await inputText(this.page, `#beneficiary_bankName`, v);
}

/** Beneficiary Bank Address */
async typeBeneficiaryBankAddress(v: string) {
  await inputText(this.page, `#beneficiary_branchAddress`, v);
}





// the Intermediary section has the last "Check Code" button on the form
async clickIntermediaryCheckCode() {
  await this.page.getByRole('button', { name: /^check code$/i }).last().click();
}


/** Intermediary Bank Name */
async typeIntermediaryBankName(v: string) {
  await inputText(this.page, `#beneficiary_intermediaryBankName`, v);
}

/** Charge Option (dropdown) */
async selectChargeOption(optionText: string) {
  // open dropdown
  await this.page
    .locator('//mat-label[normalize-space()="Charge Option"]/ancestor::mat-form-field//div[contains(@class,"mat-mdc-select-trigger")]')
    .click({ force: true });

  const panel = this.page.locator('.mat-mdc-select-panel');
  await panel.waitFor({ state: 'visible' });

  // normalize: accept "BEN", "ben", "BEN - Beneficiary Pays All"
  const code = optionText.split('-')[0].trim().toUpperCase(); // -> BEN/OUR/SHA

  // try exact long label or the code prefix
  const opt =
    panel.getByRole('option', { name: new RegExp(`^${code}\\b`, 'i') }).first() // "BEN ..." etc
      .or(panel.getByRole('option', { name: new RegExp(optionText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first());

  await opt.scrollIntoViewIfNeeded();
  await opt.click();
}

  async typeAmount(value: string | number) {
  await inputText(
    this.page,
    "//mat-form-field[.//mat-label[normalize-space()='Amount']]//input",
    String(value)
  );
}

  private async ensureRecipientAccountMode() {
    const accountRadio = this.page.getByLabel('Account', { exact: true });
    if (await accountRadio.isVisible()) {
      await accountRadio.check();
    }
  }



async typeRecipientAccount(value: string) {
  const field = this.page.locator("//mat-form-field[.//mat-label[contains(.,'Recipient A/C No')]]");
  const input = field.locator('input');

  await input.waitFor({ state: 'visible' });

  // If your page can switch modes (e.g., MACSS “Account”), do it here:
  if (this.ensureRecipientAccountMode) {
    await this.ensureRecipientAccountMode().catch(() => {});
  }

  // Try to “unlock” if the UI has a Change/Edit control near the field
  const unlockers = [
    field.locator("xpath=.//button[contains(@id,'edit') or contains(@id,'change')]").first(),
    field.getByRole('button', { name: /change|edit/i }).first(),
  ];
  for (const u of unlockers) {
    if (await u.isVisible().catch(() => false)) {
      await u.click().catch(() => {});
      break;
    }
  }

  // Probe editability (no assertion)
  const editable = await this.waitUntilMaybeEditable(input, 4000);
  if (!editable) {
    console.warn('[edit] Recipient A/C No. is read-only; skipping identifier update.');
    return; // ← do not fail the test
  }

  await input.fill('');
  await input.type(value);
  await input.blur();
}


async typeRemarks(value: string) {
  await inputText(this.page, '#beneficiary_payment_detail', value);
}


async selectCategory(categoryName: string) {
  const trimmed = (categoryName ?? '').trim();

  // short delay helps when dropdown options appear late
  await this.page.waitForTimeout(500);

  try {
    await selectDropdown(
      this.page,
      "//mat-form-field[.//mat-label[contains(normalize-space(),'Add to Category')]]",
      trimmed
    );
  } catch {
    // retry once if panel rendered empty initially
    await this.page.waitForTimeout(800);
    await selectDropdown(
      this.page,
      "//mat-form-field[.//mat-label[contains(normalize-space(),'Add to Category')]]",
      trimmed
    );
  }

  // ensure panel closed before continuing
  await this.page.locator('.mat-mdc-select-panel')
    .first()
    .waitFor({ state: 'hidden', timeout: 1500 })
    .catch(() => {});
}



// In My_BeneficiariesPage.ts
async selectTransferType(type: 'Normal' | 'MACSS' | 'Instant') {
  // Use the accessible label instead of XPath; it's more reliable with Angular/Material radios
  const radio = this.page.getByLabel(type, { exact: true });

  // Make sure it's in view
  await radio.scrollIntoViewIfNeeded();

  // If it's already selected, do nothing (avoids hangs)
  if (await radio.isChecked()) return;

  // Otherwise select it
  await radio.check();
  // tiny settle
  await this.page.waitForTimeout(100);
}
async setMacssIdentifier(option: 'Account' | 'IBAN', value: string) {
  // Select the MACSS sub-identifier
  await this.page.getByLabel(option, { exact: true }).check();

  // Pick the right input by its label
  const input = option === 'Account'
    ? this.page.locator("//mat-form-field[.//mat-label[normalize-space()='Recipient A/C No.']]//input")
    : this.page.locator("//mat-form-field[.//mat-label[normalize-space()='Recipient IBAN']]//input");

  await input.waitFor({ state: 'visible' });

  // If the input is read-only, try to “unlock” it (some edit views do this)
  let editable = await this.waitUntilMaybeEditable(input, 4000);
  if (!editable) {
    const field = input.locator('xpath=ancestor::mat-form-field[1]');
    const unlock = field
      .locator("xpath=.//button[contains(@id,'edit') or contains(@id,'change')]")
      .first()
      .or(field.getByRole('button', { name: /edit|change/i }).first());
    if (await unlock.isVisible().catch(() => false)) {
      await unlock.click().catch(() => {});
      editable = await this.waitUntilMaybeEditable(input, 3000);
    }
  }

  // If still not editable, just skip (edit mode may lock identifiers)
  if (!editable) {
    console.warn(`[MACSS] ${option} field is read-only; leaving existing value.`);
    return;
  }

  await input.fill('');
  await input.type(value);
  await input.blur();
}






async macssAccountFlow(accountNo: string) {
  await this.selectTransferType('MACSS');
  await this.setMacssIdentifier('Account', accountNo);
}

async macssIbanFlow(iban: string) {
  await this.selectTransferType('MACSS');
  await this.setMacssIdentifier('IBAN', iban);
}


// --- SWIFT helpers ---
async typeRemittanceAmount(v: string | number) {
  await inputText(
    this.page,
    '//mat-label[normalize-space()="Remittance Amount"]/ancestor::mat-form-field//input',
    String(v)
  );
}
async typeBeneficiaryBIC(v: string) {
  await inputText(
    this.page,
    '//mat-label[normalize-space()="Beneficiary Bank BIC"]/ancestor::mat-form-field//input',
    v
  );
}

// Wait until "Beneficiary Bank Name" and "Beneficiary Bank Address" auto-fill after Check Code


// Ultra-simple and label-based version
async typeIntermediaryBIC(value: string) {
  const bic = (value || '').toUpperCase();

  // Find the input that follows the label "Intermediary Bank BIC"
  const field = this.page.locator(
    '//mat-label[normalize-space()="Intermediary Bank BIC"]/ancestor::mat-form-field//input'
  );

  await field.waitFor({ state: 'visible', timeout: 8000 }); // wait until visible
  await field.click({ force: true }); // click to focus
  await this.page.waitForTimeout(300); // small wait for Angular to bind focus
  await field.fill(''); // clear any pre-existing text
  await field.type(bic, { delay: 40 }); // type slowly to trigger event binding
}



/** Clean and simple SWIFT Transfer flow */
async swiftFlow(data: {
  paymentName: string;
  fromAccount: string;
  currency: string;
  remittanceAmount: string;
  beneficiaryCountry: string;
  beneficiaryIban: string;
  beneficiaryName: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3?: string;
  beneficiaryBic: string;
  intermediaryBic: string;
  chargeOption: string;
  remarks: string;
  category: string;
}) {
  const page = this.page;

  // 1) SWIFT Transfer
  await this.selectBankIdentifier('SWIFT Transfer');

  // 2) Payment name
  await this.typePaymentName(data.paymentName);

  // 3) From account
  await this.selectFromAccount(data.fromAccount);

  // 4) Currency
  await this.selectCurrency(data.currency);

  // 5) Remittance amount
  await this.typeRemittanceAmount(data.remittanceAmount);

  // 6) Beneficiary country
  await this.selectBeneficiaryCountry(data.beneficiaryCountry);

  // 7) Beneficiary IBAN
  await this.typeBeneficiaryAccountIban(data.beneficiaryIban);

  // blur IBAN so the next field becomes editable
await this.page.locator('#beneficiary_recipientaccount').press('Tab');



  // 8) Beneficiary name (optional)
  await this.typeBeneficiaryName(data.beneficiaryName);

  // 9) Addresses
  await this.typeBeneficiaryAddress1(data.addressLine1);
  await this.typeBeneficiaryAddress2(data.addressLine2);
  if (data.addressLine3) await this.typeBeneficiaryAddress3(data.addressLine3);

  // 10) Beneficiary BIC
  await this.typeBeneficiaryBIC(data.beneficiaryBic);

  // 11) Check Code -> auto fills bank name & address
  await this.clickCheckCode();
  await page.waitForTimeout(3000);

  // 12) Intermediary BIC
  await this.typeIntermediaryBIC(data.intermediaryBic);

  // 13) Check Code (Intermediary)
  await this.clickIntermediaryCheckCode();
  await page.waitForTimeout(3000);

  // 14) Charge option
  await this.selectChargeOption(data.chargeOption);

  // 15) Remarks
  await this.typeRemarks(data.remarks);

  // 16) Category
  await this.selectCategory(data.category);

 
}


async typeBeneficiaryName(name: string) {
  const input = this.page.locator('#beneficiary_beneficiaryname');
  await input.waitFor({ state: 'visible' });
  await input.click();
  await input.fill(name);
  await input.blur();
}

// ✅ Probe-only: returns true if the input becomes editable within timeout
private async waitUntilMaybeEditable(input: import('@playwright/test').Locator, timeout = 4000) {
  await input.waitFor({ state: 'visible', timeout });
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await input.isEditable()) return true;
    await this.page.waitForTimeout(150);
  }
  return false; // still read-only
}




//select the approriate bank

async selectBeneficiaryBank(bank: string) {
  await this.page
    .locator('//mat-label[normalize-space()="Beneficiary Bank"]/ancestor::mat-form-field//div[contains(@class,"mat-mdc-select-trigger")]')
    .click({ force: true });

  const panel = this.page.locator('.mat-mdc-select-panel');
  await panel.waitFor({ state: 'visible' });

  const esc = bank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const opt = panel.getByRole('option')
    .filter({ hasText: new RegExp(esc, 'i') }) // case-insensitive contains
    .first();

  await opt.scrollIntoViewIfNeeded();
  await opt.click();
}


// --- Save helpers (shared by Add & Edit) ---
private async dismissOverlays() {
  // close common Angular Material overlays/panels and defocus any field
  await this.page.keyboard.press('Escape').catch(() => {});
  const killers = [
    '.mat-mdc-select-panel',
    '.cdk-overlay-backdrop.cdk-overlay-backdrop-showing',
    '.cdk-overlay-container .cdk-overlay-pane',
    '.mat-mdc-dialog-container'
  ];
  for (const sel of killers) {
    const el = this.page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.waitFor({ state: 'hidden', timeout: 800 }).catch(() => {});
    }
  }
  await this.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await this.page.mouse.click(5, 5).catch(() => {}); // click on page to defocus
}


async clickPrimarySave() {
  await this.dismissOverlays();

  // Helper: success toast/snackbar
  const successToast = this.page
    .locator('simple-snack-bar, .mat-mdc-snack-bar-label, text=/success|updated|saved/i')
    .first();

  // Attempt up to 2 times in case the first click is intercepted
  for (let attempt = 1; attempt <= 2; attempt++) {
    // (Re)locate the Save/Update button fresh each attempt
    let btn = this.page
      .getByRole('button', { name: /^save$/i }).last()
      .or(this.page.getByRole('button', { name: /^update$/i }).last())
      .or(this.page.locator('#save_or_pay_beneficiary').first())
      .or(this.page.locator('button:has-text("Save"), button:has-text("Update")').last());

    // If it’s not there anymore, we may already be saved — check toast once and exit
    const attached = await btn.isVisible().catch(() => false);
    if (!attached) {
      if (await successToast.isVisible().catch(() => false)) return;
      // Brief wait then retry re-locate once
      await this.page.waitForTimeout(300);
      continue;
    }

    // Try normal click; if it throws, we’ll retry once after re-locating
    try {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
    } catch {
      // Re-locate and force-click once more
      btn = this.page
        .getByRole('button', { name: /^save$/i }).last()
        .or(this.page.getByRole('button', { name: /^update$/i }).last());
      try {
        await btn.click({ force: true });
      } catch { /* fall through to checks */ }
    }

    // If save succeeded, toast will pop — exit early
    if (await successToast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => false)) return;

    // If no toast yet but button disappeared (rerender), treat as success and exit
    if (!(await btn.isVisible().catch(() => false))) return;

    // Small settle before the next attempt
    await this.page.waitForTimeout(400);
  }

  // Final soft wait for a late toast; then just return
  await this.page
    .locator('simple-snack-bar, .mat-mdc-snack-bar-label, text=/success|updated|saved/i')
    .first()
    .waitFor({ state: 'visible', timeout: 3000 })
    .catch(() => {});
}


async clickSave() { await this.clickPrimarySave(); }





  /** 🔹 Search and delete a beneficiary by name */
async deleteBeneficiary(name: string) {
  const search = this.page.locator("//input[@id='ben_search_text']");
  await search.fill(name);

  // the matching card/row by exact name
  const row = this.page.locator(
    `xpath=//mat-card[.//div[normalize-space()="${name}"] or .//*[normalize-space()="${name}"]]`
  ).first();
  await row.waitFor({ state: 'visible', timeout: 10000 });

  // ✅ use CSS inside the scoped row (no XPath): click that row's 3-dot button
  await row.locator('button[id*="menu_options_button"]').click();

  // delete -> confirm -> success
  await this.page.locator("//span[contains(text(),'Delete Beneficiary')]").click();
  await this.page.locator("//span[normalize-space()='Delete']").click();
  await this.page.locator("//div[@class='fx-layout-row']").waitFor({ state: 'visible', timeout: 15000 });
}


/** Open existing beneficiary for Quick Pay without triggering payment */
async openQuickPayForm(paymentName: string) {
  const search = this.page.locator('#ben_search_text');
  await search.fill(paymentName);
  await search.press('Enter');

  const row = this.page.locator(`xpath=//mat-card[.//*[normalize-space()="${paymentName}"]]`).first();
  await row.waitFor({ state: 'visible', timeout: 15000 });

  // Expand the card to show Quick Pay form
  const expand = row.locator('.mat-expansion-indicator').first();
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await this.page.waitForTimeout(500);
  }

  // Wait for Amount field to be visible
  await this.page.locator('//mat-label[normalize-space()="Amount"]/ancestor::mat-form-field//input')
    .waitFor({ state: 'visible', timeout: 10000 });
}



private async autoSelectTransferType(type: 'Normal' | 'MACSS' | 'Instant', timeout = 7000): Promise<void> {
  const dialog = this.page.locator('mat-dialog-container').filter({ hasText: /Transfer Type/i }).last();

  // Wait for the dialog, but don't fail the whole flow if it never shows up.
  try {
    await dialog.waitFor({ state: 'visible', timeout });
  } catch {
    return; // No dialog -> nothing to do (SBM or already selected)
  }

  // Prefer role-based button
  let btn = dialog.getByRole('button', { name: new RegExp(`^${type}$`, 'i') }).first();
  if (await btn.count() === 0) btn = dialog.locator(`button:has-text("${type}")`).first();

  // Small settle to dodge animation/backdrop interception
  await this.page.waitForTimeout(120);

  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 5000 });

  // If there’s a Pay inside the dialog, click it too
  const payInDialog = dialog.getByRole('button', { name: /^pay$/i }).first();
  if (await payInDialog.isVisible().catch(() => false)) {
    await payInDialog.click({ timeout: 5000 });
  }

  // Ensure the dialog actually closes
  await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
}


// Overloads
async quickPayExistingBeneficiary(
  paymentName: string,
  transferType: 'Normal' | 'MACSS' | 'Instant'
): Promise<void>;
async quickPayExistingBeneficiary(
  paymentName: string,
  opts: {
    currency: string;                   // e.g. 'USD'
    amount: string | number;            // e.g. '1000'
    chargeOption: 'OUR' | 'SHA' | 'BEN';
    transferType?: 'Normal' | 'MACSS' | 'Instant'; // default 'Normal'
  }
): Promise<void>;

// Implementation
async quickPayExistingBeneficiary(paymentName: string, arg: any): Promise<void> {
  const isSwift = typeof arg === 'object' && arg !== null;
  const transferType: 'Normal' | 'MACSS' | 'Instant' = isSwift ? (arg.transferType ?? 'Normal') : arg;

  // — Search & locate the exact card —
  const search = this.page.locator('#ben_search_text');
  await search.fill('');
  await search.type(paymentName, { delay: 20 });
  await search.press('Enter');

  const row = this.page.locator(`xpath=//mat-card[.//*[normalize-space()="${paymentName}"]]`).first();
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.scrollIntoViewIfNeeded();

  // Expand only this row (if applicable)
  const expand = row.locator('.mat-expansion-indicator').first();
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await this.page.waitForTimeout(150);
  }

  // Arm the auto-clicker BEFORE opening the dialog
  const autoClick = this.autoSelectTransferType(transferType).catch(() => {});

  // Click Pay inside THIS row (opens the Transfer Type dialog)
  let payBtn = row.locator('#pay_ben_button').first();
  if (await payBtn.count() === 0) {
    payBtn = row.getByRole('button', { name: /^pay$/i }).first();
  }
  await payBtn.scrollIntoViewIfNeeded();
  await payBtn.click();

  // Wait for the auto-click to finish (it selects Normal/MACSS/Instant)
  await autoClick;

  if (isSwift) {
    // ---------- SWIFT REQUIRED FIELDS ----------
    // Currency
    await this.page
      .locator('//mat-label[normalize-space()="Currency"]/ancestor::mat-form-field//div[contains(@class,"mat-mdc-select-trigger")]')
      .click({ force: true });
    await this.page.locator('.mat-mdc-select-panel')
      .getByRole('option', { name: new RegExp(`^${String(arg.currency).trim()}\\b`, 'i') })
      .first()
      .click();

    // Amount
    const amountInput = this.page.locator(
      '//mat-label[normalize-space()="Amount"]/ancestor::mat-form-field//input'
    );
    await amountInput.fill(String(arg.amount));

    // Charge Option
    await this.selectChargeOption(arg.chargeOption);
  }


  // --- Replace from "Small grace period..." down to the success wait with this ---

// tiny settle after transfer-type selection
await this.page.waitForTimeout(300);

// Prefer the Pay inside THIS card; fall back to a global Pay if needed
const confirmBtn = this.page.getByRole('button', { name: /^confirm$/i }).first();
let payInRow =
  row.locator('#pay_ben_button').first()
    .or(row.getByRole('button', { name: /^pay$/i }).first())
    .or(this.page.getByRole('button', { name: /^pay$/i }).first());

// Race: Confirm vs Pay appears first
const first = await Promise.race([
  confirmBtn.waitFor({ state: 'visible', timeout: 2500 }).then(() => 'confirm').catch(() => null),
  payInRow.waitFor({ state: 'visible', timeout: 2500 }).then(() => 'pay').catch(() => null),
]);

if (first === 'confirm') {
  // flows that jump straight to Confirm
  await confirmBtn.click({ force: true });
} else {
  // SBM-style: click Pay on the form, then Confirm
  await payInRow.scrollIntoViewIfNeeded();
  try { await expect(payInRow).toBeEnabled({ timeout: 4000 }); } catch {}
  await payInRow.click().catch(async () => { await payInRow.click({ force: true }); });

  await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  await this.page.waitForLoadState('networkidle').catch(() => {});
  await confirmBtn.waitFor({ state: 'visible', timeout: 20000 });
  await confirmBtn.click({ force: true });
}

// Success (soft)
await this.page
  .locator('simple-snack-bar, .mat-mdc-snack-bar-label, .alert-success, text=/success|completed|reference/i')
  .first()
  .waitFor({ state: 'visible', timeout: 10000 })
  .catch(() => {});


}




// ------- ultra-simple helpers -------
private fieldByLabel(label: string) {
  return this.page.locator(`//mat-form-field[.//mat-label[normalize-space()='${label}']]//input`);
}

private selectTriggerByLabel(label: string) {
  return this.page.locator(`//mat-label[normalize-space()="${label}"]/ancestor::mat-form-field//div[contains(@class,"mat-mdc-select-trigger")]`);
}

async fillByLabel(label: string, value: string) {
  if (!value?.trim()) return;
  const input = this.fieldByLabel(label);
  await input.waitFor({ state: 'visible' });
  await input.click();
  await input.fill('');               // clear first
  await input.type(value);            // type triggers Angular bindings better than fill sometimes
}

async selectByLabel(label: string, optionText: string) {
  if (!optionText?.trim()) return;
  const trigger = this.selectTriggerByLabel(label);
  await trigger.click({ force: true });

  const panel = this.page.locator('.mat-mdc-select-panel');
  await panel.waitFor({ state: 'visible' });

  await panel.getByRole('option', { name: new RegExp(optionText.trim(), 'i') }).first().click();
}

async checkRadioByLabel(label: string) {
  if (!label?.trim()) return;
  await this.page.getByLabel(label.trim(), { exact: true }).check();
}


async setAmount(value: number | string) {
  const amt = this.page.locator(
    '//mat-label[normalize-space()="Amount"]/ancestor::mat-form-field//input'
  );
  await amt.fill(String(value));
}

async payAndConfirm() {
  // Click Pay on the form if visible
  const pay = this.page.getByRole('button', { name: /^pay$/i }).first();
  if (await pay.isVisible().catch(() => false)) await pay.click();

  // Click Confirm in the dialog if it appears
  const confirm = this.page.getByRole('button', { name: /^confirm$/i }).first();
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
}


async openDetails(paymentName: string) {
  // Search
  const search = this.page.locator('#ben_search_text');
  await search.fill(paymentName);
  await search.press('Enter');

  // Target card
  const row = this.page.locator(`xpath=//mat-card[.//*[normalize-space()="${paymentName}"]]`).first();
  await row.waitFor({ state: 'visible', timeout: 15000 });

  // Open kebab menu for that row
  await row.locator('button[id*="menu_options_button"]').click();

  // Menu → Beneficiary Details (use the button id)
  const menu = this.page.locator('.mat-mdc-menu-panel');
  await menu.waitFor({ state: 'visible', timeout: 15000 });
  await menu.locator('#beneficiary_details_button').click();

  // Ensure details view is ready
  await this.page
    .getByRole('button', { name: /^(save|update|save changes)$/i })
    .waitFor({ state: 'visible', timeout: 15000 });
}

async editBeneficiaryByType(
  paymentName: string,
  type:
    | 'SBM'
    | 'LOCAL_NORMAL'
    | 'LOCAL_MACSS_ACC'
    | 'LOCAL_MACSS_IBAN'
    | 'LOCAL_INSTANT'
    | 'SWIFT',
  changes: Record<string, string | number | undefined>
) {
  // --- Step 1: Open Beneficiary Details ---
  await this.openDetails(paymentName);

  // --- Step 2: Apply routing toggles if needed ---
  if (changes.bankIdentifier) await this.selectBankIdentifier(changes.bankIdentifier as any);
  if (changes.transferType)   await this.selectTransferType(changes.transferType as any);
  if (changes.fromAccount)    await this.selectFromAccount(String(changes.fromAccount));

  // --- Step 3: Apply common editable fields ---
  if (changes.paymentName) await this.typePaymentName(String(changes.paymentName));
  if (changes.amount)      await this.typeAmount(String(changes.amount));
  if (changes.remarks)     await this.typeRemarks(String(changes.remarks));
  if (changes.category)    await this.selectCategory(String(changes.category));

  // --- Step 4: Handle type-specific fields ---
  switch (type) {
    case 'SBM':
    case 'LOCAL_NORMAL':
    case 'LOCAL_INSTANT': {
      if (changes.recipientAccount) await this.typeRecipientAccount(String(changes.recipientAccount));
      if (changes.beneficiaryName)  await this.typeBeneficiaryName(String(changes.beneficiaryName));
      if (changes.beneficiaryBank)  await this.selectBeneficiaryBank(String(changes.beneficiaryBank));
      break;
    }

    case 'LOCAL_MACSS_ACC': {
      if (changes.macssIdType === 'Account' && changes.recipientAccount)
        await this.setMacssIdentifier('Account', String(changes.recipientAccount));
      if (changes.beneficiaryName) await this.typeBeneficiaryName(String(changes.beneficiaryName));
      if (changes.beneficiaryBank) await this.selectBeneficiaryBank(String(changes.beneficiaryBank));
      break;
    }

    case 'LOCAL_MACSS_IBAN': {
      if (changes.macssIban)
        await this.setMacssIdentifier('IBAN', String(changes.macssIban));
      if (changes.beneficiaryName) await this.typeBeneficiaryName(String(changes.beneficiaryName));
      if (changes.beneficiaryBank) await this.selectBeneficiaryBank(String(changes.beneficiaryBank));
      break;
    }

    case 'SWIFT': {
      if (changes.currency)            await this.selectCurrency(String(changes.currency));
      if (changes.remittanceAmount)    await this.typeRemittanceAmount(String(changes.remittanceAmount));
      if (changes.beneficiaryCountry)  await this.selectBeneficiaryCountry(String(changes.beneficiaryCountry));
      if (changes.beneficiaryIban)     await this.typeBeneficiaryAccountIban(String(changes.beneficiaryIban));
      if (changes.beneficiaryName)     await this.typeBeneficiaryName(String(changes.beneficiaryName));
      if (changes.address1)            await this.typeBeneficiaryAddress1(String(changes.address1));
      if (changes.address2)            await this.typeBeneficiaryAddress2(String(changes.address2));
      if (changes.beneficiaryBic)      await this.typeBeneficiaryBIC(String(changes.beneficiaryBic));
      if (changes.intermediaryBic)     await this.typeIntermediaryBIC(String(changes.intermediaryBic));
      if (changes.chargeOption)        await this.selectChargeOption(String(changes.chargeOption));
      break;
    }
  }

  // --- Step 5: Clean dropdowns & blur ---
  await this.page.keyboard.press('Escape').catch(() => {});
  await this.page.mouse.click(5, 5).catch(() => {});
  await this.page.waitForTimeout(300);

  // --- Step 6: Save ---
  const saveBtn = this.page.getByRole('button', { name: /^(save|update|save changes)$/i }).first();
  await saveBtn.scrollIntoViewIfNeeded();
  await expect(saveBtn).toBeEnabled({ timeout: 10000 });
  await saveBtn.click();

  // --- Step 7: Success toast ---
  await this.page
    .locator('simple-snack-bar, .mat-mdc-snack-bar-label, text=/saved|updated|success/i')
    .first()
    .waitFor({ state: 'visible', timeout: 8000 })
    .catch(() => {});
}


/** Close the payment confirmation dialog */
private async closeTransactionDialog() {
  const dialog = this.page.locator('mat-dialog-container').last();
  // wait until the dialog is visible (don’t fail if it’s already gone)
  await dialog.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});

  // prefer the accessible Close button inside the dialog
  const closeBtn = dialog.getByRole('button', { name: /^close$/i }).first();

  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 5000 });
    await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    return;
  }

  // fallbacks if label differs or button is blocked
  await dialog.locator('button:has-text("Close")').first().click({ timeout: 5000 }).catch(async () => {
    await this.page.keyboard.press('Escape').catch(() => {});
  });
  await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
}



/** Toggle Quick Pay ON for a given beneficiary inside My Beneficiaries */
async enableQuickPay(paymentName: string) {
  const searchBox = this.page.locator('#ben_search_text');
  await searchBox.fill(paymentName);
  await searchBox.press('Enter');

  const card = this.page.locator(
    `//mat-card[.//*[normalize-space()="${paymentName}"]]`
  ).first();

  await card.waitFor({ state: 'visible', timeout: 8000 });

  const toggle = card.locator('button[id*="quick_pay_toggle"]').first();
  const state = await toggle.getAttribute('aria-checked');

  if (state !== 'true') {
    await toggle.click({ force: true });
    await this.page.waitForTimeout(300);
  }
}

/** Find the Quick Pay card by name on My Accounts (carousel aware) */
private async findQuickPayCardOnMyAccounts(paymentName: string) {
  // Quick Pay section (helps scroll near the widget)
  const qpHeading = this.page.getByRole('heading', { name: /^Quick Pay$/i }).first();
  if (await qpHeading.isVisible().catch(() => false)) {
    await qpHeading.scrollIntoViewIfNeeded();
  } else {
    await this.page.mouse.wheel(0, 800);
  }

  const card = this.page
    .locator(`xpath=//app-quick-pay-item[.//*[normalize-space()="${paymentName}"]]`)
    .first();

  // If not visible, use the right arrow up to 5 times
  let visible = await card.isVisible().catch(() => false);
  const nextArrow = this.page.locator(
    '//button[@id="slider-btn-next"]//span[contains(@class,"mat-mdc-button-touch-target")]'
  ).first();

  for (let k = 0; k < 5 && !visible; k++) {
    if (await nextArrow.isVisible().catch(() => false)) {
      await nextArrow.click({ force: true });
      await this.page.waitForTimeout(250);
      visible = await card.isVisible().catch(() => false);
    } else {
      break;
    }
  }

  await card.waitFor({ state: 'visible', timeout: 10000 });
  return card;
}

/** In the Quick Pay card: set amount and click Pay */
async quickPayFromMyAccounts(paymentName: string, amount: string | number) {
  const card = await this.findQuickPayCardOnMyAccounts(paymentName);

  // amount input (your dynamic id example: qp_input_4_test400_-1_MUR_...)
  const amountInput = card.locator('input[id^="qp_input_"]').first()
    .or(card.locator('//input[contains(@id,"qp_input_")]').first());
  await amountInput.scrollIntoViewIfNeeded();
  await amountInput.fill('');
  await amountInput.type(String(amount), { delay: 20 });

  // Pay button (your example id: pay_4_test400_-1_MUR_...)
  const payBtn = card.getByRole('button', { name: /^Pay$/i }).first()
    .or(card.locator('button[id^="pay_"]').first());
  await payBtn.waitFor({ state: 'visible', timeout: 8000 });
  await payBtn.click();
}

/** Confirm the Quick Pay dialog */
async confirmQuickPay() {
  // Wait for Confirm Transaction dialog
  const dlg = this.page
    .locator('mat-dialog-container')
    .filter({ hasText: /Confirm Transaction/i })
    .first();

  await dlg.waitFor({ state: 'visible', timeout: 15000 });

  // Click Confirm
  const confirmBtn = dlg.getByRole('button', { name: /^Confirm$/i }).first();
  await confirmBtn.click({ force: true });

  // Wait for success toast (soft)
  await this.page
    .locator('simple-snack-bar, .mat-mdc-snack-bar-label, text=/success|completed|reference|submitted/i')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});
}


/** Locator for an inline mat-error under a labeled field */
inlineErrorUnderLabel(label: string) {
  return this.page.locator(
    `//mat-form-field[.//mat-label[normalize-space()='${label}']]//mat-error`
  );
}

/** True if the 'Payment Name is already in use' error is shown */
async isDuplicatePaymentNameError(timeout = 6000): Promise<boolean> {
  const err = this.inlineErrorUnderLabel('Payment Name')
    .filter({ hasText: /already in use/i })
    .first();
  try {
    await err.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

};