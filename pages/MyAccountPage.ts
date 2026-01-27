import { Page, expect, Locator } from '@playwright/test';
import { waitForLogoutSnackbarToDisappear, waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';

type BalanceRead = {
  raw: string;        // e.g., "MUR 1,098.20" or "€ 139,426.55"
  currency: string;   // e.g., "MUR" or "€"
  value: number;      // e.g., 1098.20
};

export class MyAccount {
  private readonly page: Page;
  private readonly myAccountTab: Locator;
  private readonly myAccountLink: Locator;
  private readonly logoutButton: Locator;
  private readonly showBalancesButton: Locator;
  private readonly loginUsernameField: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myAccountTab = this.page.locator('#retail-home_hor');
    this.myAccountLink = this.page.getByRole('link', { name: /^My Accounts$/i }).first();
    this.logoutButton = this.page.locator('#BW_button_121867');
    this.showBalancesButton = this.page.getByRole('button', { name: /show balances/i });
    this.loginUsernameField = this.page.locator('#login_username');
  }

  // ---------- Existing ----------
  async assertMyAccountTabActive(): Promise<void> {
    await expect(this.myAccountTab).toBeVisible();
    await expect(this.myAccountTab).toHaveClass(/active/);
    await waitForSpinnerToDisappear(this.page);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();

    // Instead of waiting for navigation, wait for specific login element
    await this.loginUsernameField.waitFor({ state: 'visible', timeout: 120000 });

    // Skip reload-based URL assertion
    console.log('[MyAccount] Logged out via SPA — staying in same tab.');

    await waitForLogoutSnackbarToDisappear(this.page);
    console.log('[MyAccount] Logged out successfully.');
  }

  // ---------- Minimal additions for balance checking ----------

  /** Ensure we are on the My Accounts tab/page. */
  async gotoMyAccounts(): Promise<void> {
    // If already active, just wait for spinner to settle
    if (await this.myAccountTab.isVisible().catch(() => false)) {
      const cls = (await this.myAccountTab.getAttribute('class').catch(() => '')) || '';
      if (/active/.test(cls)) {
        await waitForSpinnerToDisappear(this.page);
        return;
      }
    }

    // Try the top-nav link first
    if (await this.myAccountLink.isVisible().catch(() => false)) {
      await this.myAccountLink.click();
    } else {
      // Fallback: click the tab itself
      await this.myAccountTab.click().catch(() => { });
    }
    await this.assertMyAccountTabActive();
  }

  /** If balances are hidden, show them. */
  async ensureBalancesVisible(): Promise<void> {
    if (await this.showBalancesButton.isVisible().catch(() => false)) {
      await this.showBalancesButton.click();
      await this.waitForBalancesToRefresh();
    }
  }

  /** Lightweight wait for any loading/refresh on balances. */
  async waitForBalancesToRefresh(timeoutMs: number = 10_000): Promise<void> {
    await Promise.race([
      waitForSpinnerToDisappear(this.page).catch(() => { }),
      this.page
        .waitForSelector('.global-spinner, .mat-progress-spinner, app-loader, app-spinner', {
          state: 'hidden',
          timeout: timeoutMs,
        })
        .catch(() => { }),
      this.page.waitForTimeout(800),
    ]);
  }

  /** Parse a money string like "MUR 1,098.20" or "€ 139,426.55". */
  private parseMoney(raw: string): BalanceRead {
    const txt = (raw || '').replace(/\u00A0/g, ' ').trim(); // normalize NBSP
    const m = txt.match(/\s*(MUR|EUR|USD|GBP|Rs\.?|€|\$)?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)/i);
    const currency = (m?.[1] || '').toUpperCase().replace(/\.$/, '') || (txt.includes('€') ? 'EUR' : '');
    const numStr = (m?.[2] || '').replace(/,/g, '');
    const value = Number(numStr);
    return { raw: txt, currency, value };
  }

  /**
   * Find an account tile containing the given account number (full or partial),
   * scroll it into view if needed, and return its displayed balance.
   */
  async getBalanceForAccount(accountNumber: string): Promise<BalanceRead> {
    const hint = (accountNumber || '').replace(/\s+/g, '').trim();
    if (!hint) throw new Error('getBalanceForAccount: accountNumber is required');

    await this.gotoMyAccounts();
    await this.ensureBalancesVisible();

    // Text node that matches the account number (partial allowed)
    const numberText = this.page.getByText(new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).first();

    // Scroll until visible (best-effort)
    if (!(await numberText.isVisible().catch(() => false))) {
      for (let i = 0; i < 15 && !(await numberText.isVisible().catch(() => false)); i++) {
        await this.page.mouse.wheel(0, 700).catch(() => { });
        await this.page.waitForTimeout(120);
      }
    }
    await numberText.scrollIntoViewIfNeeded().catch(() => { });
    await expect(numberText, `Account number "${hint}" should be visible`).toBeVisible({ timeout: 10_000 });

    // Nearest "card" container
    const card = numberText.locator(
      'xpath=ancestor::*[contains(@class,"card") or contains(@class,"panel") or contains(@class,"account") or self::mat-card][1]'
    );

    // Amount element within the card (common classes/tags)
    const amountRegex = /(MUR|EUR|USD|GBP|Rs\.?|€|\$)\s*-?\d[\d,]*(?:\.\d+)?/;
    let amountNode = card
      .locator(':is(app-amount, .amount, .balance, .available, .mat-body-strong, .mat-subtitle-2, span, div, p)')
      .filter({ hasText: amountRegex })
      .first();

    // Fallback: look just after the number element too
    if (!(await amountNode.isVisible().catch(() => false))) {
      amountNode = numberText
        .locator('xpath=following::span|following::div|following::p')
        .filter({ hasText: amountRegex })
        .first();
    }

    await expect(amountNode, 'Balance amount should be visible near the account card').toBeVisible({ timeout: 10_000 });

    const rawText = (await amountNode.innerText()).trim();
    const parsed = this.parseMoney(rawText);
    if (!Number.isFinite(parsed.value)) {
      throw new Error(`Could not parse balance from: "${rawText}"`);
    }
    return parsed;
  }

  /** Assert that (before - after) ~= amount, with optional tolerance for fees. */
  async expectBalanceDeducted(
    before: BalanceRead | number,
    amount: number | string,
    after: BalanceRead | number,
    tolerance = 0
  ): Promise<void> {
    const beforeVal = typeof before === 'number' ? before : before.value;
    const afterVal = typeof after === 'number' ? after : after.value;
    const amtNum = typeof amount === 'string' ? Number(String(amount).replace(/,/g, '')) : amount;

    const diff = +(beforeVal - afterVal).toFixed(2);
    const want = +(+amtNum).toFixed(2);
    const delta = Math.abs(diff - want);

    expect.soft(
      delta <= tolerance,
      `Expected deduction of ${want} (±${tolerance}). Observed: ${diff} (Δ=${delta}).`
    ).toBe(true);
  }
}
