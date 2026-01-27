// pages/PrepaidRechargePage.ts
import { expect, Page, Locator, BrowserContext } from '@playwright/test';
import { parseCurrencyToNumber } from '../Utils/currency';

export class PrepaidRechargePage {
  constructor(private page: Page) {
    this._ctx = page.context();
    this._ctx.on('page', (p) => { this._lastSeenPage = p; });
  }

  private _ctx: BrowserContext;
  private _lastSeenPage: Page | null = null;

  private _lastConfirmRate: number | null = null;
  get lastConfirmExchangeRate(): number | null { return this._lastConfirmRate; }

  // Common XPATH fragment for currency-prefixed texts
  private currencyStartsXpath =
    '[starts-with(normalize-space(.),"MUR") or ' +
    ' starts-with(normalize-space(.),"USD") or ' +
    ' starts-with(normalize-space(.),"EUR") or ' +
    ' starts-with(normalize-space(.),"GBP")]';

  // ---------- tiny utils ----------
  private async sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
  private async visible(l: Locator, timeout = 800): Promise<boolean> {
    try { await l.waitFor({ state: 'visible', timeout }); return true; } catch { return false; }
  }
  private async pickFirstVisible(cands: Locator[], timeoutEach = 600): Promise<Locator> {
    for (const c of cands) if (await this.visible(c, timeoutEach)) return c;
    if (await this.visible(this.page.locator('main'), 200)) return this.page.locator('main');
    return this.page.locator('body');
  }
  public getRechargeHeading() {
    return this.page.getByRole('heading', { name: /Recharge My Prepaid Card|Prepaid Card Recharge/i }).first();
  }
  private async adoptLatestPageIfClosed() {
    if (!this.page.isClosed()) return;
    if (this._lastSeenPage && !this._lastSeenPage.isClosed()) {
      this.page = this._lastSeenPage;
    } else {
      let live = this._ctx.pages().filter(p => !p.isClosed());
      if (!live.length) {
        const maybeNew = await this._ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
        if (maybeNew && !maybeNew.isClosed()) live = [maybeNew];
      }
      if (!live.length) throw new Error('[Recharge] No live pages available to adopt.');
      this.page = live[live.length - 1];
    }
    try { await this.page.bringToFront(); } catch {}
    await Promise.race([
      this.page.waitForLoadState('domcontentloaded').catch(() => {}),
      this.sleep(200),
    ]);
  }

  // ───────────────────────── NAVIGATION ─────────────────────────
  async openFromTopNav() {
    await this.adoptLatestPageIfClosed();
    const { page } = this;

    if (await this.isRechargePageReady(800)) return;

    await Promise.race([
      page.waitForLoadState('domcontentloaded').catch(() => {}),
      this.sleep(200),
    ]);

    const headerSelectors = [
      '#TRANSACTIONS_hor',
      'nav#TRANSACTIONS_hor',
      'header nav',
      'app-header nav',
      'mat-toolbar nav',
      'nav',
    ];

    let header: Locator | null = null;
    for (const sel of headerSelectors) {
      const loc = page.locator(sel).first();
      if (await this.visible(loc, 600)) { header = loc; break; }
    }

    const triggers: Locator[] = [
      page.getByRole('button', { name: /pay\s*&\s*transfer/i }).first(),
      page.getByRole('link',   { name: /pay\s*&\s*transfer/i }).first(),
      (header ?? page).locator('a.menu-link', { hasText: /Pay & Transfer/i }).first(),
    ];
    const payTransfer = await this.pickFirstVisible(triggers, 700);

    const openMenuIfNeeded = async () => {
      if (!(await this.isPayTransferMenuVisible())) {
        await payTransfer.scrollIntoViewIfNeeded().catch(() => {});
        await this.sleep(150);
        await payTransfer.click({ timeout: 8_000 }).catch(() => {});
        await this.waitForPayTransferMenu(8_000);
      }
    };

    await openMenuIfNeeded();

    const item = await this.findRechargeMenuItem();
    if (item) {
      await item.click({ timeout: 5_000 }).catch(() => {});
    } else {
      await openMenuIfNeeded();
      const second = await this.findRechargeMenuItem();
      if (second) await second.click({ timeout: 5_000 }).catch(() => {});
    }

    if (!(await this.isRechargePageReady(10_000))) {
      await this.adoptLatestPageIfClosed();
      if (!(await this.isRechargePageReady(3000))) {
        throw new Error('[Recharge] Page not ready after opening Pay & Transfer.');
      }
    }
  }

  private async isPayTransferMenuVisible(): Promise<boolean> {
    const { page } = this;
    const signals = [
      page.getByRole('menu').filter({ hasText: /prepaid\s*card|recharge/i }).first(),
      page.locator('[data-testid="pay-transfer-menu"]').first(),
      page.locator('.cdk-overlay-pane .mat-mdc-menu-panel, .cdk-overlay-pane .mat-menu-panel').first(),
    ];
    for (const s of signals) {
      if (await this.visible(s, 200)) return true;
    }
    return false;
  }
  private async waitForPayTransferMenu(timeout = 10_000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.isPayTransferMenuVisible()) return;
      await this.sleep(120);
    }
  }
  private async findRechargeMenuItem(): Promise<Locator | null> {
    const { page } = this;
    const candidates: Locator[] = [
      page.getByRole('menuitem', { name: /Recharge My Prepaid Card|Prepaid Card Recharge|Prepaid Card|Recharge/i }).first(),
      page.getByRole('link',     { name: /Recharge My Prepaid Card|Prepaid Card Recharge|Prepaid Card|Recharge/i }).first(),
      page.locator('.cdk-overlay-pane').last()
          .locator('a.menu-link, [role="menuitem"], .mat-mdc-menu-item, .mat-menu-item')
          .filter({ hasText: /Recharge My Prepaid Card|Prepaid Card Recharge|Prepaid Card|Recharge/i })
          .first(),
    ];
    for (const c of candidates) {
      if (await this.visible(c, 500)) return c;
    }
    return null;
  }
  private async isRechargePageReady(timeoutMs = 3000): Promise<boolean> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end && !this.page.isClosed()) {
      if (await this.visible(this.getRechargeHeading(), 200)) return true;
      if (await this.visible(this.amountInput(), 200)) return true;
      if (await this.visible(this.transferBtn(), 200)) return true;
      await this.sleep(100);
    }
    return false;
  }

  // ───────────────────────── FORM FIELDS ─────────────────────────
  private amountInput(): Locator {
    return this.page.locator('app-transaction-amount-input').locator('input, textarea').first();
  }
  private remarksInput(): Locator {
    return this.page.getByRole('textbox', { name: /Remarks/i });
  }
  private transferBtn(): Locator {
    return this.page.getByRole('button', { name: /^Transfer$/ });
  }
  // ADDED: tiny helpers for Confirm step navigation and back
  private backBtn(): Locator {
    return this.page.getByRole('button', { name: /back/i }).first();
  }
  private confirmStepHeader(): Locator {
    return this.page.getByText(/please confirm|confirm details|review details/i).first();
  }

  // ───────────────────────── READERS ─────────────────────────
  async readFromAccountNumber(): Promise<string> {
    await this.adoptLatestPageIfClosed();
    const row = this.page.getByText(/^From Account$/).locator('xpath=ancestor::div[1]');
    const acct = row.locator('xpath=.//p[2]').first();
    await acct.waitFor({ state: 'visible', timeout: 5000 });
    return (await acct.textContent())!.trim();
  }
  async readSelectedFromAccountBalance(): Promise<number> {
    //await this.adoptLatestPageIfClosed();
    const fromAccountLabelEle = this.page.getByText(/^From Account$/).locator('xpath=ancestor::div[1]');
    const balanceEle = fromAccountLabelEle.locator('xpath=.//p[contains(@class,"acc-balance") or contains(@class,"balance")]').first();
    //if (await this.visible(balanceEle, 1200)) 
      const initialBalanceVal = (await balanceEle.textContent())?.trim() || '';
      const initialBal = parseCurrencyToNumber(initialBalanceVal);
      
      return initialBal;
    
    // fallback (very defensive)
    // const strict = fromAccountLabelEle.locator(
    //   'xpath=.//*[self::p or self::span]' +
    //   '[starts-with(normalize-space(.),"MUR") or starts-with(normalize-space(.),"USD") or ' +
    //   ' starts-with(normalize-space(.),"EUR") or starts-with(normalize-space(.),"GBP")]'
    // ).first();
    // if (await this.visible(strict, 1200)) {
    //   const raw = (await strict.textContent())?.trim() || '';
    //   const n = parseCurrencyToNumber(raw);
    //   console.log("This is the value for strict variable"+n)
    //   if (Number.isFinite(n)) return n;
    // }
    // const global = this.page.locator('p.acc-balance').first();
    // await global.waitFor({ state: 'visible', timeout: 3000 });
    //return parseCurrencyToNumber((await global.textContent())!.trim());
  }
  async readSelectedFromAccountCurrency(): Promise<string | null> {
    //await this.adoptLatestPageIfClosed();
    const row = this.page.getByText(/^From Account$/).locator('xpath=ancestor::div[1]');
    const candidate = row.locator(
      'xpath=.//*[self::p or self::span][starts-with(normalize-space(.),"MUR") or starts-with(normalize-space(.),"USD") or starts-with(normalize-space(.),"EUR") or starts-with(normalize-space(.),"GBP")]'
    ).first();
    if (await this.visible(candidate, 1200)) {
      const raw = (await candidate.textContent())?.trim() || '';
      const code = raw.slice(0, 3).toUpperCase();
      return /^[A-Z]{3}$/.test(code) ? code : null;
    }
    return null;
  }

  /** Original basic reader (kept for back-compat). */
  async readPayToCurrencyAndBalance(): Promise<{ currency: string; amount: number; raw: string } | null> {
    await this.adoptLatestPageIfClosed();
    const root = this.page.getByText(/^(Pay\/Transfer To|Pay Transfer To)$/).locator('xpath=ancestor::div[1]');
    const el = root.locator(
      'xpath=.//p[contains(@class,"acc-balance")][contains(.,"USD") or contains(.,"MUR") or contains(.,"EUR") or contains(.,"GBP")]'
    ).first();
    if (await this.visible(el, 1200)) {
      const raw = (await el.textContent())!.trim();
      return { raw, currency: raw.slice(0, 3).toUpperCase(), amount: parseCurrencyToNumber(raw) };
    }
    return null;
  }

  /** Stronger one-shot read for "Pay/Transfer To" balance. */
  private async _readPayToOnce():
    Promise<{ currency: string; amount: number; raw: string } | null> {
    await this.adoptLatestPageIfClosed();

    const label = this.page.getByText(/^(Pay\/Transfer To|Pay Transfer To)$/).first();
    const containers: Locator[] = [
      label.locator('xpath=ancestor::div[1]'),
      label.locator('xpath=ancestor::div[2]'),
      label.locator('xpath=ancestor::div[3]'),
      this.page.locator('xpath=//*[normalize-space()="Pay/Transfer To"]/following::div[1]'),
    ];

    for (const row of containers) {
      const candidates: Locator[] = [
        row.locator('xpath=.//p[contains(@class,"acc-balance") or contains(@class,"balance")]').first(),
        row.locator(`xpath=.//*[self::p or self::span][${this.currencyStartsXpath}]`).first(),
      ];
      for (const el of candidates) {
        if (await this.visible(el, 500)) {
          const raw = (await el.textContent())?.trim() || '';
          const amount = parseCurrencyToNumber(raw);
          if (Number.isFinite(amount)) {
            return { raw, currency: raw.slice(0, 3).toUpperCase(), amount };
          }
        }
      }
    }
    return null;
  }

  /** Public: read "Pay/Transfer To" with retries (handles slow rendering). */
  async readPayToCurrencyAndBalanceRetry(maxWaitMs = 6000):
    Promise<{ currency: string; amount: number; raw: string } | null> {
    const end = Date.now() + maxWaitMs;
    let last: { currency: string; amount: number; raw: string } | null = null;

    while (Date.now() < end) {
      try { await this.page.mouse.wheel(0, 200); } catch {}
      last = await this._readPayToOnce();
      if (last) return last;
      await this.sleep(200);
    }
    return last;
  }

  /** Try to read the currency selected in the "Currency" field (e.g. "USD"). */
  async readFormCurrency(): Promise<string | null> {
    await this.adoptLatestPageIfClosed();
    const sel = this.page.locator('app-transaction-amount-input mat-select, mat-select#transaction_amount').first();
    if (await this.visible(sel, 1000)) {
      const text = await sel.locator('.mat-select-value, .mat-mdc-select-value').first().textContent().catch(() => '');
      return (text || '').trim().slice(0, 3).toUpperCase() || null;
    }
    const txt = await this.page
      .getByText(/^Currency/i)
      .locator('xpath=following::*[self::div or self::span or self::p][1]')
      .first()
      .textContent()
      .catch(() => null);
    return (txt || '').trim().slice(0, 3).toUpperCase() || null;
  }

  // ADDED: generic error surface for limit/snackbar/dialog
  errorBanner(): Locator {
    return this.page
      .locator('.mat-mdc-snack-bar-container, .mat-snack-bar-container, mat-dialog-container, [role="alert"]')
      .filter({ hasText: /limit|exceed/i });
  }

  // ───────────────────────── ACTIONS ─────────────────────────
  async selectFromAccount(targetAccount: string, timeout = 8000) {
    await this.adoptLatestPageIfClosed();
    if (!targetAccount) return;

    const normalizeDigits = (s: string) => (s || '').replace(/\D/g, '');
    const wanted = normalizeDigits(targetAccount);
    const last4 = wanted.slice(-4);

    const fromRow = this.page.getByText(/^From Account$/).locator('xpath=ancestor::div[1]');

    try {
      const already = await fromRow.locator('xpath=.//p[1]').first().textContent({ timeout: 600 });
      if (already && normalizeDigits(already).includes(wanted)) return;
    } catch {}

    const triggers: Locator[] = [
      fromRow.locator('mat-select, .mat-select, .mat-mdc-select, .mat-select-trigger, .mat-mdc-select-trigger').first(),
      fromRow.locator('button[role="combobox"], [aria-haspopup="listbox"]').first(),
      fromRow.locator('xpath=.//*[self::div or self::span][@role="combobox"]').first(),
      fromRow,
    ];

    for (const t of triggers) { try { await t.click({ timeout: 1200 }); break; } catch {} }

    const panel = this.page
      .locator('.cdk-overlay-pane:has(.mat-select-panel, .mat-mdc-select-panel), .cdk-overlay-pane:has(.mdc-list)')
      .last();
    await panel.waitFor({ state: 'visible', timeout });

    const options = panel.locator('.mat-option, .mat-mdc-option, [role="option"], .mdc-list-item');
    const count = await options.count();
    if (!count) throw new Error('[Recharge] From Account dropdown opened but no options found.');

    let exactIdx: number | null = null;
    const last4Matches: number[] = [];
    for (let i = 0; i < count; i++) {
      const txt = (await options.nth(i).innerText()).trim();
      const digits = (txt || '').replace(/\D/g, '');
      if (digits === wanted || digits.includes(wanted)) { exactIdx = i; break; }
      if (last4 && digits.endsWith(last4)) last4Matches.push(i);
    }

    const clickIdx = exactIdx !== null ? exactIdx : (last4Matches.length === 1 ? last4Matches[0] : 0);
    await options.nth(clickIdx).click({ timeout: 2000 }).catch(() => {});
    await panel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  async fillDetails(opts: { amount: string; remarks: string }) {
    await this.adoptLatestPageIfClosed();
    const amt = this.amountInput();
    await amt.waitFor({ state: 'visible', timeout: 10_000 });

    await amt.click({ clickCount: 3 }).catch(() => {});
    await this.page.keyboard.press('Delete').catch(() => {});
    await amt.type(String(opts.amount), { delay: 20 }).catch(() => {});
    await amt.press('Tab').catch(() => {});

    const got = await amt.inputValue().catch(() => '');
    if (!got || got === '0' || got === '0.00') {
      const h = await amt.elementHandle();
      if (h) {
        await h.evaluate((el, v) => {
          const input = el as HTMLInputElement;
          input.focus();
          input.value = v;
          input.dispatchEvent(new Event('input',  { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          (input as any).blur?.();
        }, String(opts.amount));
        await this.sleep(120);
      }
    }

    await this.remarksInput().fill(opts.remarks);
  }

  private async ensureTransferReady() {
    await this.adoptLatestPageIfClosed();
    const btn = this.transferBtn();
    await btn.scrollIntoViewIfNeeded();
    const enabled = await btn.isEnabled();
    if (!enabled) {
      const errors = await this.page
        .locator('mat-error, .mat-mdc-form-field-error, .mat-error')
        .allTextContents()
        .catch(() => []);
      const errMsg = errors.length ? errors.map(e => e.trim()).filter(Boolean).join(' | ') : 'none';
      const amountVal = await this.amountInput().inputValue().catch(() => '');
      const remarksVal = await this.remarksInput().inputValue().catch(() => '');
      throw new Error(
        `[Recharge] Transfer button is disabled. amount="${amountVal}", remarks="${remarksVal}", errors="${errMsg}"`
      );
    }
  }

  // ADDED: Details → Confirm (no submit) and Back → Details
  async goToConfirm(): Promise<void> {
    this._lastConfirmRate = null;
    await this.ensureTransferReady();
    await this.transferBtn().click();
    const ok = await this.waitForConfirmVisible(6000);
    if (!ok) throw new Error('[Recharge] Confirm screen not visible after clicking Transfer.');
    // capture rate if present
    this._lastConfirmRate = await this.readConfirmExchangeRate();
  }

  async backToDetails(): Promise<void> {
    if (await this.visible(this.backBtn(), 500)) {
      await this.backBtn().click().catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.page.getByText(/details/i).first().waitFor({ state: 'visible', timeout: 8_000 });
  }

  // ADDED: read Amount (MUR) on Confirm and compute probe-based MUR per unit
  async readMurAmountOnConfirm(): Promise<number> {
    const valueCell = this.page
      .locator('xpath=//div[normalize-space()="Amount"]/following-sibling::*[1]')
      .first();
    await valueCell.waitFor({ state: 'visible', timeout: 5_000 });
    const raw = (await valueCell.textContent()) ?? '';
    const n = Number(raw.replace(/[^\d.,-]/g, '').replace(/,/g, ''));
    if (!Number.isFinite(n)) throw new Error(`Cannot parse MUR Amount from: ${raw}`);
    return n;
  }

  async computeMurPerUnit(): Promise<number> {
    await this.fillDetails({ amount: '100.00', remarks: 'probe' });
    await this.goToConfirm();
    const murFor100 = await this.readMurAmountOnConfirm();
    await this.backToDetails();
    return murFor100 / 100;
  }

  // ───────────────────────── CONFIRM ─────────────────────────
  private async confirmRoot(): Promise<Locator> {
    const cand: Locator[] = [
      this.page.getByRole('heading', {
        name: /Please Confirm|Confirm Details|Review Details|Confirm Transaction/i
      }).first().locator('xpath=ancestor::*[self::section or self::div][1]'),
      this.page.locator('.mat-mdc-dialog-container .mat-mdc-dialog-content').first(),
      this.page.locator('mat-dialog-content').first(),
      this.page.locator('app-transaction-confirmation, app-transaction-review').first(),
    ];
    return this.pickFirstVisible(cand, 700);
  }
  private async waitForConfirmVisible(timeout = 8000): Promise<boolean> {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      await this.adoptLatestPageIfClosed();
      const root = await this.confirmRoot();
      if (await this.visible(root, 200)) return true;
      await this.sleep(100);
    }
    return false;
  }

  private async readConfirmExchangeRate(): Promise<number | null> {
    try {
      const root = await this.confirmRoot();
      const label = root.getByText(/^Exchange Rate$/i).first();
      await label.waitFor({ state: 'visible', timeout: 2000 });
      const val = label.locator('xpath=following::*[self::div or self::span or self::td or self::p][1]').first();
      const raw = (await val.textContent())?.trim() || '';
      const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '');
      const rate = parseFloat(cleaned);
      return Number.isFinite(rate) ? rate : null;
    } catch { return null; }
  }


  // Switch the "Currency" of the Amount field (e.g., 'USD', 'EUR', 'GBP')
async selectFormCurrency(code: string, timeout = 8000) {
  await this.adoptLatestPageIfClosed();

  const wanted = code.toUpperCase().slice(0, 3);
  const wrapper = this.page.locator('app-transaction-amount-input').first();
  const trigger = wrapper.locator('mat-select, .mat-select, .mat-mdc-select, [role="combobox"]').first();

  await trigger.click({ timeout });

  const panel = this.page
    .locator('.cdk-overlay-pane .mat-select-panel, .cdk-overlay-pane .mat-mdc-select-panel')
    .last();
  await panel.waitFor({ state: 'visible', timeout });

  const opt = panel
    .locator('.mat-option, .mat-mdc-option, [role="option"]')
    .filter({ hasText: new RegExp(`^\\s*${wanted}\\b`, 'i') })
    .first();

  await opt.click({ timeout });
  await panel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

  // quick sanity check — selected value shows the code
  await expect(trigger).toContainText(new RegExp(`^\\s*${wanted}\\b`, 'i'), { timeout: 5000 });
}


  async submitAndConfirm() {
    this._lastConfirmRate = null;

    await this.ensureTransferReady();
    await this.transferBtn().click();

    if (!(await this.waitForConfirmVisible(6000))) {
      const snackbar = await this.page
        .locator('simple-snack-bar .mat-mdc-snack-bar-label, .mdc-snackbar__label')
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(`[Recharge] Confirm UI did not appear. Snackbar="${(snackbar || '').trim() || 'none'}"`);
    }

    // capture rate on the confirm screen
    this._lastConfirmRate = await this.readConfirmExchangeRate();

    // Robust "Confirm" click
    const candidates: Locator[] = [
      this.page.getByRole('button', { name: /^Confirm$/i }).first(),
      this.page.locator('.cdk-overlay-pane').last().getByRole('button', { name: /^Confirm$/i }).first(),
      this.page.locator('button:has-text("Confirm")').first(),
      this.page.locator('button:has-text("Proceed")').first(),
      this.page.locator('button:has-text("OK")').first(),
    ];

    let confirmBtn: Locator | null = null;
    for (const c of candidates) if (await this.visible(c, 1200)) { confirmBtn = c; break; }
    if (!confirmBtn) throw new Error('[Recharge] Could not find Confirm button.');

    await this.waitOverlaysGone(5000);
    try { await confirmBtn.click({ timeout: 2000 }); }
    catch {
      const box = await confirmBtn.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await this.page.mouse.down(); await this.page.mouse.up();
      } else {
        const handle = await confirmBtn.elementHandle();
        if (handle) await this.page.evaluate((el) => (el as HTMLElement).click(), handle);
      }
    }
  }

  // ───────────────────────── SUCCESS PAGE ─────────────────────────
  async waitForSuccess(timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await this.adoptLatestPageIfClosed();

      const indicators: Locator[] = [
        this.page.getByRole('heading', { name: /Transfer successful|Transaction Successful|Recharge Successful|Done|Success/i }).first(),
        this.page.getByText(/Transfer successful/i).first(),
        this.page.getByRole('button', { name: /Start Another Transfer/i }).first(),
        this.page.locator('text=/^Payment Date$/i').first(),
        this.page.locator('text=/^eBanking Reference$/i').first(),
      ];

      for (const ind of indicators) {
        if (await ind.isVisible().catch(() => false)) return;
      }

      try { await this.page.mouse.wheel(0, 500); } catch {}
      await this.sleep(250);
    }
    throw new Error('[Recharge] Success screen did not appear in time.');
  }

  private async successRoot(): Promise<Locator> {
    const heading = this.page.getByRole('heading', {
      name: /Transfer successful|Transaction Successful|Recharge Successful|Success|Done|Transaction Details|Payment Details/i
    }).first();

    const cand: Locator[] = [
      heading.locator('xpath=ancestor::*[self::section or self::div][1]'),
      this.page.locator('app-transaction-completion, app-transaction-success, app-transaction-done, app-transaction-details').first(),
      this.page.locator('main'),
      this.page.locator('body'),
    ];
    return this.pickFirstVisible(cand, 700);
  }

  // ---------- blockers/overlays ----------
  private async waitOverlaysGone(timeoutMs = 5000) {
    const end = Date.now() + timeoutMs;
    const blockers = this.page.locator(
      '.cdk-overlay-backdrop, .global-spinner, .mdc-linear-progress, .mat-progress-bar'
    );
    while (Date.now() < end) {
      const anyVisible = await blockers.isVisible().catch(() => false);
      if (!anyVisible) break;
      await this.sleep(150);
    }
  }

  // ---------- SUCCESS → Start Another Transfer ----------
  private startAnotherTransferCandidates(): Locator[] {
    const { page } = this;
    const root = page.locator('body');
    return [
      page.getByRole('button', { name: /Start Another Transfer/i }).first(),
      root.locator('button:has-text("Start Another Transfer")').first(),
      root.locator('a:has-text("Start Another Transfer")').first(),
      this.successRoot().then(r => r.locator('button, a').filter({ hasText: /Start Another Transfer/i }).first()) as unknown as Locator,
    ];
  }

  private async clickLikeYouMeanIt(btn: Locator) {
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await this.waitOverlaysGone(3000);

    try { await btn.click({ timeout: 2000 }); return; } catch {}

    try {
      const box = await btn.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await this.page.mouse.down(); await this.page.mouse.up(); return;
      }
    } catch {}

    try {
      const h = await btn.elementHandle();
      if (h) { await this.page.evaluate((el) => (el as HTMLElement).click(), h); return; }
    } catch {}

    try {
      await btn.focus();
      await this.page.keyboard.press('Enter');
      return;
    } catch {}

    throw new Error('[Recharge] Could not activate "Start Another Transfer".');
  }

  async clickStartAnotherTransfer() {
    await this.waitForSuccess();

    let cand: Locator | null = null;
    for (const loc of this.startAnotherTransferCandidates()) {
      if (await this.visible(loc, 800)) { cand = loc; break; }
    }
    if (!cand) throw new Error('[Recharge] "Start Another Transfer" button not found.');

    const closeWatcher = this.page.waitForEvent('close').catch(() => {});
    await this.clickLikeYouMeanIt(cand);
    await Promise.race([this.sleep(250), closeWatcher]).catch(() => {});

    await this.adoptLatestPageIfClosed();
    await expect(this.getRechargeHeading()).toBeVisible({ timeout: 10_000 });
  }
}
