import { Page, expect, Locator } from '@playwright/test';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";


export class LoginPage {
  private readonly page: Page;
  private readonly usernameField: Locator;
  private readonly legacyUsernameField: Locator;
  private readonly passwordField: Locator;
  private readonly legacyPasswordField: Locator;
  private readonly nextButton: Locator;
  private readonly loginButton: Locator;
  private readonly legacyLoginButton: Locator;
  private readonly continueButton: Locator;
  private readonly legacyContinueButton: Locator;
  private readonly errorBanner: Locator;

  private readonly utilityLibraryPage: utilityLibrary;


  constructor(page: Page) {
    this.page = page;
    this.usernameField = this.page.getByRole('textbox', { name: /Username/i }).first();
    this.legacyUsernameField = this.page.locator('#login_username');
    this.passwordField = this.page.getByRole('textbox', { name: /^Password$/i }).first();
    this.legacyPasswordField = this.page.locator('input[type="password"].mat-mdc-input-element, #login_password').first();
    this.nextButton = this.page.getByRole('button', { name: /^Next$/i }).first();
    this.loginButton = this.page.getByRole('button', { name: /^Login$/i }).first();
    this.legacyLoginButton = this.page.locator('#BW_button_802163');
    this.continueButton = this.page.getByRole('button', { name: /^Continue$/i }).first();
    this.legacyContinueButton = this.page.locator('#BW_button_083592');
    this.errorBanner=this.page.locator(`xpath=//app-alert-popup//p`)
    this.utilityLibraryPage = new utilityLibrary(page)

  }

  private async isVisible(loc: Locator, timeout = 0) {
    try { await loc.waitFor({ state: 'visible', timeout }); return true; } catch { return false; }
  }

  /** Navigates to SBM login page (only if not already there). */
  async goto(): Promise<void> {
    const onApp = /\/root\//.test(this.page.url());
    if (!onApp) {
      console.log('[LoginPage] Navigating to login screen...');
      await this.page.goto('/BWInternet380/', { waitUntil: 'domcontentloaded', timeout: 3000000 });
    }

    // Wait for either Username or Password field (new/old UIs)
    await Promise.race([
      this.page.getByRole('textbox', { name: /Username/i }).waitFor({ state: 'visible', timeout: 30000 }).catch(() => { }),
      this.page.locator('#login_username').waitFor({ state: 'visible', timeout: 30000 }).catch(() => { }),
      this.page.getByRole('textbox', { name: /^Password$/i }).waitFor({ state: 'visible', timeout: 30000 }).catch(() => { }),
    ]);

    await expect(this.page).toHaveTitle(/SBM Internet Banking/);
    console.log('[LoginPage] Login page loaded.');
  }

  /** Handles both the new 2-step and the old 1-step login flows. */
  async login(username: string, password: string): Promise<void> {
    // --- Step 1: Username (new UI) or just fill on old UI if present
    let userField = (await this.isVisible(this.legacyUsernameField)) ? this.legacyUsernameField : this.usernameField;

    if (await this.isVisible(userField, 500)) {
      await userField.fill(username);

      // Click "Next" if it exists (new UI)
      if (await this.isVisible(this.nextButton, 5000)) {
        await this.nextButton.click();
      }
    }

    // --- Step 2: Password
    let passField = this.passwordField;
    if (!(await this.isVisible(passField, 1500))) {
      passField = this.legacyPasswordField;
    }
    await passField.waitFor({ state: 'visible', timeout: 30_000 });
    await passField.fill(password);

    // --- Submit (support both UIs)
    if (await this.isVisible(this.loginButton, 1000)) {
      await this.loginButton.click();
    } else {
      await this.legacyLoginButton.click();
    }

    // Wait for any loader
    await waitForSpinnerToDisappear(this.page);

    // Checking if error banner message is displayed after login
    if (await this.isVisible(this.errorBanner, 4000)) {
      // Do NOT throw here
      return;
    }

    // Optional "Continue" prompt after login (both versions)
    if (await this.isVisible(this.continueButton, 4000)) {
      await this.continueButton.click({ force: true });
      console.log('[LoginPage] Continue button clicked after login.');
    } else if (await this.isVisible(this.legacyContinueButton, 1000)) {
      await this.legacyContinueButton.click({ force: true });
      console.log('[LoginPage] Continue button clicked after login (legacy).');
    }

    // Landed inside the app
    await expect(this.page).toHaveURL(/\/root\/summary|\/summary/, { timeout: 15000 });
  }

  async enterUserName(user: string): Promise<void> {
    let userField = (await this.isVisible(this.legacyUsernameField)) ? this.legacyUsernameField : this.usernameField;
    await userField.fill(user);
  }

  async enterPassword(password: string): Promise<void> {
    let passField = this.passwordField;
    if (!(await this.isVisible(passField, 1500))) {
      passField = this.legacyPasswordField;
    }
    await passField.waitFor({ state: 'visible', timeout: 30_000 });
    await passField.fill(password);
  }

  async submit(): Promise<void> {
    if (await this.isVisible(this.loginButton, 1000)) {
      await this.loginButton.click();
    } else {
      await this.legacyLoginButton.click();
    }
  }

  async enterUserNameAndPassword(user: string, password: string): Promise<void> {
    await this.enterUserName(user);
    // Click "Next" if it exists (new UI)
    if (await this.isVisible(this.nextButton, 5000)) {
      await this.nextButton.click();
    }
    await this.enterPassword(password);
  }

  async isLoginSuccessful(): Promise<boolean> {
  try {
    await this.page.waitForURL(/\/root\/summary|\/summary/, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async getLoginErrorMessage(): Promise<string> {
  if (await this.isVisible(this.errorBanner, 2000)) {
    const text = await this.errorBanner.innerText();
    return text.trim();
  }
  return '';
}

  /** Logs out, handling both new and legacy UIs (+ safe fallbacks). */
  async logout(): Promise<void> {
    const { page } = this;

    // If we already see the login screen, nothing to do.
    const onLoginScreen =
      (!/\/root\//.test(page.url())) &&
      (await this.isVisible(page.getByRole('textbox', { name: /Username/i }).first(), 600) ||
        await this.isVisible(page.locator('#login_username').first(), 600));
    if (onLoginScreen) return;

    // 1) Try to open a profile/account menu that might contain logout.
    const menuTriggers: Locator[] = [
      page.getByRole('button', { name: /profile|user|account|settings/i }).first(),
      page.locator('[aria-label*="profile" i], [aria-label*="user" i]').first(),
      page.locator('button[mat-menu-trigger], [aria-haspopup="menu"]').last(),
      page.locator('app-header [aria-haspopup="menu"], header [aria-haspopup="menu"]').last(),
    ];
    for (const t of menuTriggers) {
      try {
        if (await this.isVisible(t, 800)) {
          await t.click({ timeout: 1200 });
          // If logout becomes visible, stop trying more triggers.
          const maybeLogout = page.locator('text=/^\\s*(Logout|Log\\s*out|Sign\\s*out|Sign\\s*off)\\s*$/i').first();
          if (await this.isVisible(maybeLogout, 800)) break;
        }
      } catch { /* next trigger */ }
    }

    // 2) Click any visible "logout" item (various wordings).
    const logoutCandidates: Locator[] = [
      page.getByRole('menuitem', { name: /logout|log\s*out|sign\s*out|sign\s*off/i }).first(),
      page.getByRole('button', { name: /logout|log\s*out|sign\s*out|sign\s*off/i }).first(),
      page.locator('a,button').filter({ hasText: /logout|log\s*out|sign\s*out|sign\s*off/i }).first(),
    ];

    let clicked = false;
    for (const c of logoutCandidates) {
      try { if (await this.isVisible(c, 800)) { await c.click(); clicked = true; break; } } catch { }
    }

    // 3) If we couldn't click anything, try a direct logout URL.
    if (!clicked) {
      await page.goto('/BWInternet380/logout').catch(() => { });
    }

    // 4) Confirm dialog if it appears.
    const confirmBtn = page.getByRole('button', { name: /yes|confirm|ok/i }).first();
    if (await this.isVisible(confirmBtn, 1500)) {
      await confirmBtn.click().catch(() => { });
    }

    // 5) Wait spinners and land back on login UI.
    await waitForSpinnerToDisappear(page).catch(() => { });
    try {
      await Promise.race([
        page.getByRole('textbox', { name: /Username/i }).first().waitFor({ state: 'visible', timeout: 12_000 }),
        page.locator('#login_username').first().waitFor({ state: 'visible', timeout: 12_000 }),
      ]);
    } catch {
      // Hard fallback: clear cookies and navigate home.
      try { await page.context().clearCookies(); } catch { }
      await page.goto('/BWInternet380/').catch(() => { });
      await page.getByRole('textbox', { name: /Username/i }).first()
        .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => { });
    }
  }
}
