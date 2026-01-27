import { Page, expect } from '@playwright/test';
import { LoginPage } from './loginPage';
import * as allure from "allure-js-commons";

export class ForgotUsernamePage {
  readonly page: Page;
  private loginPage: LoginPage;

  constructor(page: Page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
  }

  /* -----------------------------
   * Navigate to Forgot Username Page
   * ----------------------------- */
  async goto() {
    await allure.step('Navigate to Login Page', async () => {
      await this.loginPage.goto();
    });

    await allure.step('Click on Forgot Username', async () => {
      await this.page.locator('a[href="/BWInternet380/forgotusername"]').click();
    });

    await expect(this.page).toHaveURL(/forgotusername/);
  }

  /* -----------------------------
   * Mobile Number Field
   * ----------------------------- */
  mobileNumberField() {
    return this.page.locator('#mobileNumber');
  }

  async enterMobileNumber(value: string) {
    await allure.step(`Enter mobile number: ${value}`, async () => {
      await this.mobileNumberField().fill(value);
    });
  }

  /* -----------------------------
   * Last 4 Digits Field
   * ----------------------------- */
  last4DigitsField() {
    return this.page.locator('#last4Digits');
  }

  async enterLast4Digits(value: string) {
    await allure.step(`Enter last 4 digits: ${value}`, async () => {
      await this.last4DigitsField().fill(value);
    });
  }

  /* -----------------------------
   * Password Field
   * ----------------------------- */
  passwordField() {
    return this.page.locator('#passwordField');
  }

  async enterPassword(value: string) {
    await allure.step(`Enter password: ${value}`, async () => {
      await this.passwordField().fill(value);
    });
  }

  /* -----------------------------
   * Send Username Button
   * ----------------------------- */
  sendUsernameButton() {
    return this.page.getByRole('button', { name: 'Send Username' });
  }

  async clickSendUsername() {
    await allure.step('Submit Forgot Username', async () => {
      await this.sendUsernameButton().click();
    });
  }

  /* -----------------------------
   * Error Messages
   * ----------------------------- */
  async expectMobileError(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  async expectLast4DigitsError(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  async expectPasswordError(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  /* -----------------------------
   * Page URL Validation
   * ----------------------------- */
  async expectURL(regex: RegExp) {
    await expect(this.page).toHaveURL(regex);
  }
}