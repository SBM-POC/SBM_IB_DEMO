// pages/cardsPage.ts
import { Page, Locator, expect } from '@playwright/test';

export interface CardDetails {
  name: string;
  number: string;
  expiry: string;
}

export interface SnackbarMessage {
  type: 'success' | 'error' | null;
  message: string | null;
}

export class CardsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // -----------------------------
  // Navigation
  // -----------------------------
  async gotoCards(): Promise<void> {
    const cardsLink = this.page.locator('li#cards_hor > a.menu-link');
    await expect(cardsLink).toBeVisible({ timeout: 10000 });
    await cardsLink.click();
    await expect(this.page).toHaveURL(/\/cards$/, { timeout: 30000 });
  }

  // -----------------------------
  // Card Locators & Expansion
  // -----------------------------
  private get allHeaders(): Locator {
    return this.page.locator('mat-expansion-panel-header');
  }

  async getRealCardHeaders(): Promise<Locator[]> {
    const count = await this.allHeaders.count();
    const realHeaders: Locator[] = [];
    for (let i = 0; i < count; i++) {
      const header = this.allHeaders.nth(i);
      const text = (await header.innerText()).trim();
      const isReal =
        text.includes('Debit Card') ||
        text.includes('Prepaid Card') ||
        (await header.locator('.card-name').count()) > 0;
      if (isReal) realHeaders.push(header);
    }
    return realHeaders;
  }

  async expandAllRealCards(): Promise<Locator[]> {
    const headers = await this.getRealCardHeaders();
    for (const header of headers) {
      const expanded = await header.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await header.scrollIntoViewIfNeeded();
        await header.click();
        await this.page.waitForTimeout(300);
      }
    }
    return headers;
  }

  // -----------------------------
  // Card Details
  // -----------------------------
  async getCardDetails(cardHeader: Locator): Promise<CardDetails> {
    const name = (await cardHeader.locator('.card-name').innerText()).trim();
    const number = (await cardHeader.locator('.card-number').innerText()).trim();
    const expiry = (await cardHeader.locator('.expired-col p:last-child').innerText()).trim();
    return { name, number, expiry };
  }

  // -----------------------------
  // Toggle Helpers
  // -----------------------------
  private getToggle(cardHeader: Locator, selector = 'mat-slide-toggle button[role="switch"]'): Locator {
    return cardHeader.locator(selector);
  }

  async toggleCard(cardHeader: Locator, selector?: string): Promise<string> {
    const toggle = this.getToggle(cardHeader, selector);
    const initial = (await toggle.getAttribute('aria-checked')) ?? 'false';
    await toggle.click();
    await this.page.waitForTimeout(400);
    const after = (await toggle.getAttribute('aria-checked')) ?? 'false';
    return after;
  }

  // -----------------------------
  // Snackbar Handling
  // -----------------------------
  async waitForSnackbar(timeout = 7000): Promise<SnackbarMessage> {
    const success = this.page.locator('.mat-mdc-snack-bar-label p:has-text("successfully")');
    const error = this.page.locator('.mat-mdc-snack-bar-label p:has-text("Error")');

    try {
      await Promise.race([
        success.waitFor({ state: 'visible', timeout }),
        error.waitFor({ state: 'visible', timeout })
      ]);
    } catch {
      return { type: null, message: null };
    }

    if (await success.isVisible()) {
      return { type: 'success', message: await success.textContent() };
    }
    if (await error.isVisible()) {
      return { type: 'error', message: await error.textContent() };
    }
    return { type: null, message: null };
  }

  // -----------------------------
  // Dialog Handling
  // -----------------------------
  async handleConfirmationDialog(): Promise<void> {
    const dialog = this.page.locator('.mat-mdc-dialog-container');
    if (!(await dialog.isVisible().catch(() => false))) return;

    const confirmBtn = this.page.locator('button:has-text("Confirm")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await dialog.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }

  // -----------------------------
  // Reset PIN
  // -----------------------------
  async openResetPinDialog(cardHeader: Locator) {
    const resetPinToggle = cardHeader.locator('div.card-toggle.reset-pin');
    if ((await resetPinToggle.count()) === 0) return null;
    await resetPinToggle.click();
    const dialog = this.page.locator('app-reset-card-pin-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    return dialog;
  }

  async fillPin(dialog: Locator, pin: string, confirmPin: string) {
    const pinInput = dialog.locator('input[formcontrolname="pin"]');
    const confirmInput = dialog.locator('input[formcontrolname="confirmPin"]');
    await pinInput.fill(pin);
    await confirmInput.fill(confirmPin);
  }

  async cancelPinDialog(dialog: Locator) {
    const cancelBtn = dialog.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }
  }
}