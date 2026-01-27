import { Page, expect } from '@playwright/test';
import { LoginPage } from './loginPage';
import * as allure from "allure-js-commons";

export class ResetPasswordPage {
  private page: Page;
  private loginPage: LoginPage;

  constructor(page: Page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
  }

  /* -----------------------------
   * Common Steps
   * ----------------------------- */
  async gotoForgotPassword(username: string) {
    await allure.step('Navigate to Login Page', async () => {
      await this.loginPage.goto();
    });

    await allure.step('Enter Username', async () => {
      await this.page.locator('#login_username').fill(username);
    });

    await allure.step('Click on Next button', async () => {
      await this.page.getByRole('button', { name: 'Next' }).click();
    });

    await allure.step('Click on Forgot Password', async () => {
      await this.page.locator('a[href="/BWInternet380/resetPassword"]').click();
    });
  }

  async chooseOnlineBanking() {
    await allure.step('Select Online Banking', async () => {
      await this.page.getByRole('button', { name: /Online Banking/i }).click();
    });
    await expect(this.page).toHaveURL(/resetPassword\/onlineBankingPasswordRest/);
  }

  async chooseDigitalWallet() {
    await allure.step('Select Digital Wallet', async () => {
      await this.page.locator('#walletBtn').click();
    });
  }

  /* -----------------------------
   * Fill Details
   * ----------------------------- */
  async fillDigitalWalletDetails(username: string, mobileNumber: string) {
    await allure.step('Fill details', async () => {
      await this.page.locator('#sms_username').fill(username);
      await this.page.locator('#mobileNumber').fill(mobileNumber);
    });
  }

  async fillOnlineBankingByAccount(username: string, mobileNumber: string, accountNumber: string) {
    await allure.step('Fill details', async () => {
      await this.page.locator('#sms_username').fill(username);
      await this.page.locator('#mobileNumber').fill(mobileNumber);
      await this.page.locator('#accountNumber').fill(accountNumber);
    });
  }

  async fillOnlineBankingByCard(details: {
    username: string;
    cardNumber: string;
    pin: string;
    accountExpiry: string;
    newPassphrase: string;
    confirmPassphrase: string;
  }) {
    await allure.step('Fill details', async () => {
      await this.page.locator('#card_username').fill(details.username);
      await this.page.locator('#cardNumber').fill(details.cardNumber);
      await this.page.locator('#pin').fill(details.pin);
      await this.page.locator('#account_number-001').fill(details.accountExpiry);
      await this.page.locator('#newPassphrase').fill(details.newPassphrase);
      await this.page.locator('#confirmNewPassphrase').fill(details.confirmPassphrase);
    });
  }

  /* -----------------------------
   * Select Options
   * ----------------------------- */
  async selectByAccount() {
    await allure.step('Select By Account', async () => {
      await this.page.locator('text=By Account').click();
    });
  }

  async selectByCard() {
    await allure.step('Select By Card', async () => {
      await this.page.locator('text=By Card').click();
    });
  }

  /* -----------------------------
   * Reset Button Verification
   * ----------------------------- */
  async verifyResetButtonEnabled(selector: string) {
    await allure.step('Reset Button Active', async () => {
      const btn = this.page.locator(selector);
      await expect(btn).toBeEnabled();
    });
  }
}