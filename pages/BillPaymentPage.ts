import { Locator, Page, expect } from '@playwright/test';

export class BillPaymentPage {
  private readonly page: Page;

  // Tiles / navigation
  private readonly btnGovernment: Locator;
  private readonly btnEasyPay: Locator;
  private readonly btnPaySbmCard: Locator;
  private readonly btnOtherUtilities: Locator;
  private readonly btnMobileTopUp: Locator;

  // Form fields
  private readonly inpSaveAs: Locator;
  private readonly inpReference: Locator;   // also used for “Contract Account Number”
  private readonly inpRemarks: Locator;
  private readonly inpAmount: Locator;
  private readonly sbmCardSearchInput: Locator;
  private readonly sbmCardSearchBtn:   Locator;

  // Dropdowns
  private readonly drpFromAccount: Locator;
  private readonly drpBillCategory: Locator; // spare

  // Actions
  private readonly btnPay: Locator;
  private readonly btnSaveAndPay: Locator;
  private readonly btnSave: Locator;

  // Dialogs / messages
  private readonly confirmDlg: Locator;
  private readonly successMsg: Locator;   // success dialog after Confirm
  private readonly savedToast: Locator;   // snackbar after Save (no payment)

  // Inline error messages (for negative tests)
  private readonly errSaveAsMsg: Locator;
  private readonly errRefMsg: Locator;
  private readonly errRemarksMsg: Locator;
  private readonly errAmountMsg: Locator;
  private readonly dailyLimitToast: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tiles
    this.btnGovernment     = page.locator(`//p[text()="Government Billers"]`).first();
    this.btnEasyPay        = page.locator(`//p[text()="EasyPay"]`).first();
    this.btnPaySbmCard     = page.locator(`//p[text()="Pay SBM Credit Card"]`).first();
    this.btnOtherUtilities = page.locator(`//p[text()="Other Utilities"]`).first();
    this.btnMobileTopUp    = page.locator(`//p[text()="Mobile TopUp"]`).first();

    // Form
    this.inpSaveAs    = page.locator('#template_name');
    this.inpReference = page.locator('#template_customer_reference'); // Reference / Contract Account
    this.inpRemarks   = page.locator('#template_payment_details');
    this.inpAmount    = page.locator('#transaction_amount');

    // Dropdowns
    this.drpFromAccount  = page.getByLabel('From Account');
    this.drpBillCategory = page.locator('#mat-select-value-37');

    // Actions
    this.btnPay        = page.locator(`//button[.//span[normalize-space()="Pay"]]`);
    this.btnSaveAndPay = page.getByRole('button', { name: /save\s*(?:&|\band\b)\s*pay/i });
    this.btnSave       = page.locator(
      "//button[.//span[normalize-space()='Save'] and not(.//span[contains(normalize-space(.), 'Save & Pay')])]"
    );
    this.sbmCardSearchInput = page.getByLabel('Credit Card Number').first();
    this.sbmCardSearchBtn   = page.getByRole('button', { name: /^Search$/i }).first();


    // Confirm dialog (anchor on title)
    this.confirmDlg = page.locator(`mat-dialog-container:has-text("Please Confirm")`).first();

    // Success sentence after Confirm
    this.successMsg = page
      .locator("//mat-dialog-container//p[contains(.,'The payment was processed successfully')]")
      .first();

    // Toast message after Save (no payment)
    this.savedToast = page.locator("//simple-snack-bar[contains(., 'has been saved successfully')]");

    this.dailyLimitToast = page
  .locator("//simple-snack-bar[contains(., 'Daily') and contains(., 'limit') and contains(., 'Exceeded')]")
  .first();

    // ---- Inline validation errors (texts from your UI) ----
    this.errSaveAsMsg   = page.locator("mat-error, .mat-mdc-form-field-error")
      .filter({ hasText: /Nickname is required/i }).first();
    this.errRefMsg      = page.locator("mat-error, .mat-mdc-form-field-error")
      .filter({ hasText: /Contract Account Number is required/i }).first();
    this.errRemarksMsg  = page.locator("mat-error, .mat-mdc-form-field-error")
      .filter({ hasText: /Remarks is required/i }).first();
    this.errAmountMsg   = page.locator("mat-error, .mat-mdc-form-field-error")
      .filter({ hasText: /Amount is required/i }).first();
  }

  // ---------------- Small helpers for mixed forms ----------------

  /** Wait until a form field is visible (Save As OR Reference Number). */
  async waitForFormReady(): Promise<void> {
    await Promise.race([
      this.inpSaveAs.waitFor({ state: 'visible', timeout: 10_000 }),
      this.inpReference.waitFor({ state: 'visible', timeout: 10_000 }),
    ]);
  }

  /** Some billers (e.g., EasyPay) don't have Save As. */
  async hasSaveAs(): Promise<boolean> {
    return this.inpSaveAs.isVisible();
  }

  // ---------------- Navigation ----------------

  async clickBillerGroup(groupText: string): Promise<void> {
    await this.page.locator(`//p[text()="${groupText}"]`).first().click();

    // Guard elements that indicate the group view is open
    const guard = this.page.locator(
      [
        "//h1[normalize-space()='Billers']",
        "//h2[normalize-space()='Billers']",
        `//h1[normalize-space()='${groupText}']`,
        `//h2[normalize-space()='${groupText}']`,
        "//div[contains(@class,'mat-mdc-tab-list')]",
      ].join(' | ')
    ).first();

    await expect(guard).toBeVisible({ timeout: 15_000 });
  }

  async scrollBillersRight(times = 3) {
    for (let i = 0; i < times; i++) {
      const next = this.page
        .locator(
          'button.mat-mdc-tab-header-pagination-after, ' +
            'button:has(mat-icon[svgicon="chevron-right"]), ' +
            'button:has(mat-icon[name="chevron_right"])'
        )
        .first();
      if (await next.isVisible()) {
        await next.click();
      } else {
        const list = this.page.locator('div.mat-mdc-tab-list').first();
        if (await list.count()) {
          await list.evaluate(el =>
            el.scrollBy({ left: 600, behavior: 'instant' as ScrollBehavior })
          );
        }
      }
      await this.page.waitForTimeout(120);
    }
  }

  // ---------- Shared tile helpers (used by EasyPay & normal billers)

  private tileByLabel(label: string) {
    return this.page
      .locator(`//p[@class="group-name" and normalize-space()="${label}"]`)
      .first();
  }

  private async clickTile(label: string, scrollTries = 4) {
    const target = this.tileByLabel(label);
    for (let i = 0; i <= scrollTries; i++) {
      if (await target.isVisible()) break;
      await this.scrollBillersRight(1);
    }
    const tile = this.page
      .locator(`xpath=//p[@class="group-name" and normalize-space()="${label}"]/ancestor::a[1]`)
      .first();
    if (await tile.count()) await tile.click();
    else await target.click();
  }

  // ---------- EasyPay-specific navigation

  async clickEasyPayCategory(category: string) {
    await this.clickBillerGroup('EasyPay');
    await this.clickTile(category);
  }

  async clickEasyPayBiller(biller: string, subcategory?: string) {
    if (subcategory) await this.clickTile(subcategory);
    await this.clickTile(biller);
    await this.waitForFormReady();
  }

  /** One-shot: EasyPay → category → optional subcategory → biller */
  async openEasyPayPath(opts: { category: string; subcategory?: string; biller: string }) {
    await this.clickBillerGroup('EasyPay');
    await this.clickTile(opts.category);
    if (opts.subcategory) await this.clickTile(opts.subcategory);
    await this.clickTile(opts.biller);
    await this.waitForFormReady();
  }

  /** Click a biller tile by visible name (non-EasyPay flows) */
  async clickBiller(name: string, scrollTries = 3) {
    const label = this.tileByLabel(name);
    for (let i = 0; i <= scrollTries; i++) {
      if (await label.isVisible()) break;
      await this.scrollBillersRight(1);
    }
    const tile = this.page
      .locator(`xpath=//p[@class="group-name" and normalize-space()="${name}"]/ancestor::a[1]`)
      .first();
    if (await tile.count()) await tile.click();
    else await label.click();

    await this.waitForFormReady();
    const rx = new RegExp(name.replace(/\s+/g, '\\s+'));
    await expect(this.page.locator('body')).toContainText(rx, { timeout: 10_000 });
  }

  // ---------------- Form helpers ----------------

  async typeSaveAs(v: string) {
    await this.inpSaveAs.fill(v);
    await this.inpSaveAs.blur(); // trigger inline validation (e.g., duplicate-name error)
  }

// BillPaymentPage.ts
async typeReferenceNumber(v: string) {
  await this.inpReference.waitFor({ state: 'visible' });
  if (!(await this.inpReference.isEditable().catch(() => false))) {
    // Read-only in the Pay SBM Credit Card flow – skip typing.
    return;
  }
  await this.inpReference.fill(v);
}

  
  // Reference / Contract Account
  async typeAmount(v: string | number) { await this.inpAmount.fill(String(v)); }
  async typeRemarks(v: string)         { await this.inpRemarks.fill(v); }

// Under // ---------------- Form helpers ----------------

async getRemarksValue(): Promise<string> {
  return (await this.inpRemarks.inputValue()) ?? '';
}

/** If original > max, assert the input is truncated; else assert it matches. */

async expectRemarksTruncatedIfTooLong(original: string, max: number) {
  await this.inpRemarks.waitFor({ state: 'visible' });

  // try to read a non-empty value for up to ~3s
  let val = '';
  for (let i = 0; i < 12; i++) {            // 12 * 250ms = 3s
    val = (await this.inpRemarks.inputValue()).trim();
    if (val !== '' || original.trim() === '') break;
    await this.page.waitForTimeout(250);
  }

  // If UI enforces maxlength, we only guarantee it won't exceed max and is a prefix
  if (original.length > max) {
    expect(val.length).toBeLessThanOrEqual(max);
    expect(original.startsWith(val)).toBeTruthy();
  } else {
    expect(val).toBe(original.trim());
  }
}



  /** Locator + helper for duplicate "Save As" error */
  duplicateSaveAsError() {
    return this.page
      .locator(
        `#mat-mdc-error-10, 
         //mat-error[contains(.,'already in use')] | 
         //span[contains(.,'already in use')] | 
         //div[contains(@class,'error')][contains(.,'already in use')]`
      )
      .first();
  }
  async isDuplicateSaveAsVisible(timeoutMs = 1200): Promise<boolean> {
    const err = this.duplicateSaveAsError();
    try {
      await err.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }
  /** Assert the duplicate Save As error is visible (use in negative tests). */
  async expectDuplicateSaveAsVisible(timeoutMs = 4000): Promise<void> {
    await expect(this.duplicateSaveAsError()).toBeVisible({ timeout: timeoutMs });
  }

  /** Select “From Account” (robust). */
  async selectFromAccount(account: string) {
    const digits = (account ?? '').replace(/[^\d]/g, '');
    if (!digits) throw new Error('FromAccountNo is empty after normalization.');

    await this.drpFromAccount.scrollIntoViewIfNeeded();
    await this.drpFromAccount.click();

    const panel = this.page.locator('.cdk-overlay-pane').last();
    await panel.waitFor({ state: 'visible' });

    const option = panel.getByText(new RegExp(`\\b${digits}\\b`), { exact: false }).first();
    if (await option.isVisible()) {
      await option.click();
      return;
    }
    await this.page.keyboard.type(digits, { delay: 40 });
    await this.page.keyboard.press('Enter');
  }

  // ---------------- Actions ----------------

  async clickPay() { await this.btnPay.click(); }

  async clickSaveAndPay() {
    await this.btnSaveAndPay.scrollIntoViewIfNeeded();
    await expect(this.btnSaveAndPay).toBeVisible({ timeout: 10_000 });
    await expect(this.btnSaveAndPay).toBeEnabled({ timeout: 10_000 });
    await this.btnSaveAndPay.click();
  }

  async clickSave() { await this.btnSave.click(); }

  async submit(action: 'Pay' | 'Save & Pay' | 'Save' = 'Pay') {
    if (action === 'Save & Pay') return this.clickSaveAndPay();
    if (action === 'Save')       return this.clickSave();
    return this.clickPay();
  }

  /** Clicks the requested action to trigger inline validation (negative tests). */
  async triggerValidationVia(action: 'Pay' | 'Save & Pay' | 'Save') {
    if (action === 'Save & Pay') await this.clickSaveAndPay();
    else if (action === 'Save')  await this.clickSave();
    else                         await this.clickPay();
    await this.page.waitForTimeout(300); // allow mat-error render
  }

  /** Assert presence of required-field errors based on flags. */
  async expectRequiredErrors(opts: {
    saveAs?: boolean;
    reference?: boolean;
    remarks?: boolean;
    amount?: boolean;
  }) {
    const checks: Array<Promise<any>> = [];
    if (opts.saveAs)    checks.push(expect(this.errSaveAsMsg).toBeVisible());
    if (opts.reference) checks.push(expect(this.errRefMsg).toBeVisible());
    if (opts.remarks)   checks.push(expect(this.errRemarksMsg).toBeVisible());
    if (opts.amount)    checks.push(expect(this.errAmountMsg).toBeVisible());
    await Promise.all(checks);
  }

  // Useful when some flows skip "Please Confirm" and go straight to success.
  async waitForConfirmOrSuccess(): Promise<'confirm' | 'success'> {
    const confirmLike = this.page
      .locator(`mat-dialog-container:has-text("Please Confirm"), mat-dialog-container:has(button:has-text("Confirm"))`)
      .first();

    try {
      await confirmLike.waitFor({ state: 'visible', timeout: 8_000 });
      return 'confirm';
    } catch {
      await this.successMsg.waitFor({ state: 'visible', timeout: 30_000 });
      return 'success';
    }
  }

  // ---------------- Snapshot ----------------

  async captureForm(): Promise<{
    fromAccount: string;
    reference?: string;
    contractAccount?: string;
    amount: string;
    remarks: string;
  }> {
    const fromText = (await this.drpFromAccount.textContent()) ?? '';
    const fromAccount = fromText.match(/\d{10,20}/)?.[0] ?? fromText.replace(/[^\d]/g, '');

    const idField = (await this.inpReference.inputValue()).trim();
    const reference       = idField || undefined;
    const contractAccount = idField || undefined;

    const amount  = (await this.inpAmount.inputValue()).trim();
    const remarks = (await this.inpRemarks.inputValue()).trim();

    return { fromAccount, reference, contractAccount, amount, remarks };
  }

  // ---------------- Confirmation dialog ----------------

  private valueNextTo(label: string) {
    return this.confirmDlg.locator(
      `xpath=.//*[normalize-space(text())='${label}']/following-sibling::*[1]`
    );
  }

  private fmtMur(amount: string | number) {
    const n = Number(String(amount).replace(/[^\d.-]/g, ''));
    return `MUR ${n.toFixed(2)}`;
  }

async verifyConfirmModal(data: {
  fromAccount: string;
  reference?: string;
  contractAccount?: string;
  billerName?: string;
  amount: string | number;
  paymentDate?: string;
  remarks?: string;
  allowBlankAmount?: boolean;   // ← already in your type
}) {
  await expect(this.confirmDlg).toBeVisible({ timeout: 10_000 });

  const acctDigits =
    data.fromAccount.match(/\d{10,20}/)?.[0] ?? data.fromAccount.replace(/[^\d]/g, '');
  await expect(this.confirmDlg).toContainText(new RegExp(`\\b${acctDigits}\\b`));

  const idForTo = data.reference ?? data.contractAccount;
  if (idForTo) {
    const digits = String(idForTo).replace(/\D/g, '');
    const last4  = digits.slice(-4);
    const toCell = this.valueNextTo('To');

    // 1) Strict: full digits as one block
    let matched = false;
    try {
      await expect
        .poll(async () => (await toCell.textContent()) ?? '', { timeout: 2000, intervals: [250] })
        .toMatch(new RegExp(`\\b${digits}\\b`));
      matched = true;
    } catch {
      console.log('Strict full-digits match failed');
    }

    // 2) Loose: allow non-digits between digits (handles spaces/masking)
    if (!matched) {
      try {
        const loose = new RegExp(digits.split('').join('\\D*')); // 4\\D*5\\D*4...
        await expect
          .poll(async () => (await toCell.textContent()) ?? '', { timeout: 1500, intervals: [250] })
          .toMatch(loose);
        matched = true;
      } catch {
        console.log('Loose digits-with-separators match failed');
      }
    }

    // 3) Fallback: last 4 anywhere
    if (!matched && last4) {
      try {
        await expect
          .poll(async () => (await toCell.textContent()) ?? '', { timeout: 1500, intervals: [250] })
          .toMatch(new RegExp(`\\b${last4}\\b`));
        matched = true;
      } catch {
        console.log('Last-4 match failed');
      }
    }

    if (!matched) {
      throw new Error(
        `Could not verify "To" cell. Tried full [${digits}], loose, and last4 [${last4}].`
      );
    }
  }

  if (data.billerName) await expect(this.confirmDlg).toContainText(data.billerName);

  // --- Amount handling (supports over-limit modal that shows just "MUR") ---
  if (data.allowBlankAmount) {
    // In the limit-exceeded flow, the modal shows only the currency label.
    await expect(this.valueNextTo('Amount')).toContainText(/\bMUR\b/);
  } else {
    await expect(this.valueNextTo('Amount')).toHaveText(this.fmtMur(data.amount));
  }

  if (data.paymentDate) await expect(this.valueNextTo('Payment Date')).toHaveText(data.paymentDate);
  if (data.remarks)     await expect(this.valueNextTo('Remarks')).toHaveText(data.remarks);
}

  async verifyEnsureNotes() {
    await expect(this.confirmDlg).toContainText('Kindly ensure that:');
    await expect(this.confirmDlg).toContainText(
      'There is sufficient balance in your debiting account on the processing date.'
    );
    await expect(this.confirmDlg).toContainText(
      'The transaction amount is within your daily transaction limit.'
    );
  }

  async confirmPayment() {
    const dlg = this.page.locator('mat-dialog-container').last();
    await dlg.waitFor({ state: 'visible', timeout: 10_000 });
    const btn = dlg.getByRole('button', { name: /^Confirm$/ });
    await expect(btn).toBeEnabled({ timeout: 5_000 });
    await btn.click();
  }

  // ---------------- Result messages ----------------

  /** Wait for success sentence; returns eBanking reference if present. */
  async waitForSuccessMessage(): Promise<string | undefined> {
    await expect(this.successMsg).toBeVisible({ timeout: 30_000 });
    const text = (await this.successMsg.textContent()) ?? '';
    return text.match(/reference\s+is\s+(\d+)/i)?.[1];
  }

  /** Wait for snackbar “has been saved successfully” (Save only). */
  async waitForSavedToast(opts: { waitToHide?: boolean } = {}) {
    const rx = /has been saved successfully/i;
    await expect(this.page.locator('body')).toContainText(rx, { timeout: 10_000 });
    if (opts.waitToHide) {
      await expect(this.page.locator('body')).not.toContainText(rx, { timeout: 10_000 });
    }
  }

  // Close the success dialog safely
  async closeSuccessDialog() {
    const dlg = this.page
      .locator("xpath=//mat-dialog-container[.//p[contains(.,'The payment was processed successfully')]]")
      .first();

    await expect(dlg).toBeVisible({ timeout: 30_000 });
    await dlg.locator("xpath=.//span[normalize-space()='Close']/ancestor::button[1]").click();
    await expect(dlg).toBeHidden({ timeout: 10_000 });
  }

// Replace the whole method with this:
async expectDailyLimitExceeded() {
  // Case–insensitive match for the snackbar text
  const rx = /daily\s*limit\s*exceed/i;

  // Snackbars can be either element depending on Angular version/skin
  const toast = this.page
    .locator('simple-snack-bar, mat-snack-bar-container')
    .filter({ hasText: rx })
    .first();

  // Wait up to 15s for the banner to appear
  await expect(toast).toBeVisible({ timeout: 15_000 });

  // Optional: close it if there is an action/close button
  await toast.locator('button, .mat-mdc-snack-bar-action').first().click().catch(() => {});

  // Sanity: make sure the success dialog didn’t show in an error case
  await expect(this.successMsg).toHaveCount(0);
}



  // ---------------- Template Quick Pay helpers ----------------

  /** Clicks the first visible Pay button under Payment Templates, confirms if needed, waits for success. */
  async quickTemplatePay(): Promise<string | undefined> {
    const section = this.page.locator("xpath=//h3[normalize-space()='Payment Templates']");
    if (await section.count()) {
      await section.first().scrollIntoViewIfNeeded();
    } else {
      await this.page.mouse.wheel(0, 800);
    }

    const payBtn = this.page
      .locator("xpath=//mat-expansion-panel//button[.//span[normalize-space()='Pay']]")
      .first();

    await payBtn.scrollIntoViewIfNeeded();
    await payBtn.click();

    const stage = await this.waitForConfirmOrSuccess();
    if (stage === 'confirm') {
      await this.confirmPayment();
    }

    const ref = await this.waitForSuccessMessage();
    await this.closeSuccessDialog();
    return ref;
  }

  /** Scroll to Payment Templates, open a template by name (SaveAs), Pay, Confirm, wait for success. */
  async quickTemplatePayByName(templateName?: string): Promise<string | undefined> {
    const section = this.page.locator("h3:has-text('Payment Templates')");
    if (await section.count()) await section.first().scrollIntoViewIfNeeded();
    else await this.page.mouse.wheel(0, 800);

    let header: Locator;
    if (templateName && templateName.trim()) {
      const name = templateName.trim();
      header = this.page
        .locator("mat-expansion-panel .mat-expansion-panel-header")
        .filter({ hasText: name })
        .first();
    } else {
      header = this.page.locator("mat-expansion-panel .mat-expansion-panel-header").first();
    }

    await header.waitFor({ state: 'attached', timeout: 10_000 });
    await header.scrollIntoViewIfNeeded();

    const panel = header.locator('xpath=ancestor::mat-expansion-panel[1]');
    const expanded = await panel.getAttribute('aria-expanded');
    if (expanded !== 'true') await header.click();

    const payBtn = panel.locator("button:has-text('Pay')").first();
    await payBtn.scrollIntoViewIfNeeded();
    await payBtn.click();

    const stage = await this.waitForConfirmOrSuccess();
    if (stage === 'confirm') await this.confirmPayment();

    const ref = await this.waitForSuccessMessage();
    await this.closeSuccessDialog();
    return ref;
  }

  // Helper to grab a row/panel by visible text (e.g., "PAYMENT CEB8")
  private panelByName(name: string) {
    return this.page.locator('mat-expansion-panel').filter({ hasText: name }).first();
  }

// 🔪 Simple delete by template "Save As" text
// BillPaymentPage.ts

/** Delete a payment template by its "Save As" (panel title). */
async deleteTemplate(saveAs: string): Promise<void> {
  const { page } = this;

  // 1) Make sure the section is on screen
  const section = page.locator("h3:has-text('Payment Templates')").first();
  if (await section.count()) await section.scrollIntoViewIfNeeded();

  // 2) Find the row by visible text, scrolling if needed
  const row = page.locator('mat-expansion-panel')
    .filter({ hasText: new RegExp(`\\b${saveAs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') })
    .first();

  // Try to bring it into view with a few scrolls
  for (let i = 0; i < 12; i++) {             // ~12 scrolls is plenty for short lists
    if (await row.isVisible().catch(() => false)) break;
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(120);
  }
  await row.waitFor({ state: 'visible', timeout: 10_000 });

  // 3) Open the kebab menu on that row
  const kebab = row.locator(
    [
      "button[aria-haspopup='menu']",
      "button.mat-mdc-menu-trigger",
      "button:has(.mat-icon[svgicon='more_vert'])",
      "button:has(.mat-icon[name='more_vert'])"
    ].join(', ')
  ).first();
  await kebab.click();

  // 4) Click "Delete Payment" in the menu
  const menu = page.locator('.cdk-overlay-pane .mat-mdc-menu-panel').last();
  await menu.waitFor({ state: 'visible', timeout: 3_000 });
  await menu.getByRole('menuitem', { name: /delete payment/i }).click();

  // 5) Confirm in the dialog
  const dialog = page.locator('mat-dialog-container').last();
  await dialog.waitFor({ state: 'visible', timeout: 5_000 });
  await dialog.getByRole('button', { name: /^Delete$/i }).click();

  // 6) Wait for the success banner and for the row to disappear
  const banner = page.locator('text=/Payment template has been deleted/i').first();
  await expect(banner).toBeVisible({ timeout: 10_000 });

  await expect(
    page.locator('mat-expansion-panel')
        .filter({ hasText: new RegExp(`\\b${saveAs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') })
  ).toHaveCount(0);
}


// ===== Template edit helpers =====

// find a template row/panel by visible header text
private templateRow(name: string) {
  return this.page
    .locator('mat-expansion-panel')
    .filter({ has: this.page.locator('.mat-expansion-panel-header', { hasText: name }) })
    .first();
}

// open the ⋮ menu for a template row and return the overlay panel
private async openTemplateMenu(name: string) {
  const row = this.templateRow(name);
  await row.waitFor({ state: 'attached', timeout: 10_000 });
  await row.scrollIntoViewIfNeeded();

  // expand if collapsed so the menu button is visible
  if ((await row.getAttribute('aria-expanded')) !== 'true') {
    await row.locator('.mat-expansion-panel-header').click();
  }

  const kebab = row.locator(
    [
      "button[aria-haspopup='menu']",
      "button.mat-mdc-menu-trigger",
      "button:has(mat-icon[svgicon='more_vert'])",
      "button:has(mat-icon[name='more_vert'])",
      "button:has(svg[aria-hidden='true'])"
    ].join(', ')
  ).first();

  await kebab.click();
  const overlay = this.page.locator('div.cdk-overlay-pane .mat-mdc-menu-panel').last();
  await overlay.waitFor({ state: 'visible', timeout: 3000 });
  return overlay;
}

/** Edit a saved template by name. Only fields you pass will be changed. */
async editTemplate(
  name: string,
  opts: { reference?: string; amount?: string | number; remarks?: string; fromAccount?: string }
): Promise<void> {
  // 1) open menu → Edit
  const overlay = await this.openTemplateMenu(name);
  const editItem = overlay
    .getByRole('menuitem', { name: /Edit Payment/i })
    .or(overlay.locator("//span[normalize-space()='Edit Payment']/ancestor::button[1]"))
    .first();
  await editItem.click();

  // 2) wait for form
  await this.waitForFormReady();

  // 3) apply changes
  if (opts.fromAccount) await this.selectFromAccount(opts.fromAccount);
  if (typeof opts.reference !== 'undefined') await this.typeReferenceNumber(opts.reference);
  if (typeof opts.amount    !== 'undefined') await this.typeAmount(String(opts.amount));
  if (typeof opts.remarks   !== 'undefined') await this.typeRemarks(opts.remarks);

  // 4) save
  await this.clickSave();
}



  /** Pay SBM Credit Card: click tile → search by card number → wait for form. */
// BillPaymentPage.ts
async openPaySbmCreditCardAndSearch(cardNumber: string) {
  await this.btnPaySbmCard.click();

  await this.sbmCardSearchInput.waitFor({ state: 'visible', timeout: 10_000 });
  await this.sbmCardSearchInput.fill(cardNumber);

  await Promise.all([
    // form re-renders after search; wait for it
    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
    this.sbmCardSearchBtn.click(),
  ]);

  await this.waitForFormReady();

  // sanity: the read-only ref shows the searched card (last 4)
  const want = String(cardNumber).replace(/\D/g, '').slice(-4);
  const got  = (await this.inpReference.inputValue()).replace(/\D/g, '');
  expect(got.endsWith(want)).toBeTruthy();
}


}
