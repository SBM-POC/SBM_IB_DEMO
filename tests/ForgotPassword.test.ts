import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import * as allure from "allure-js-commons";

// ===============================================================
// COMMON STEPS
// ===============================================================
async function gotoForgotPassword(page: Page) {
  const loginPage = new LoginPage(page);

  await allure.step('Navigate to Login Page', async () => {
    await loginPage.goto();
  });

  await allure.step('Enter Username', async () => {
    await page.locator('#login_username').fill('testuser123');
  });

  await allure.step('Click on Next button', async () => {
    await page.getByRole('button', { name: 'Next' }).click();
  });

  await allure.step('Click on Forgot Password', async () => {
    await page.locator('a[href="/BWInternet380/resetPassword"]').click();
  });
}

async function chooseOnlineBanking(page: Page) {
  await allure.step('Select Online Banking', async () => {
    await page.getByRole('button', { name: /Online Banking/i }).click();
  });
  await expect(page).toHaveURL(/resetPassword\/onlineBankingPasswordRest/);
}

async function chooseDigitalWallet(page: Page) {
  await allure.step('Select Digital Wallet', async () => {
    await page.locator('#walletBtn').click();
  });
}

// ====================================================================
// TEST 1: DIGITAL WALLET
// ====================================================================
test('Digital Wallet - Reset', async ({ page }) => {

  allure.parentSuite('Reset Password');
  allure.suite('Digital Wallet');


  await gotoForgotPassword(page);
  await chooseDigitalWallet(page);

  await allure.step('Fill details', async () => {
    await page.locator('#sms_username').fill('walletUser001');
    await page.locator('#mobileNumber').fill('58123456');
  });

  await allure.step('Reset Button Active', async () => {
    const nextBtn = page.locator('#BW_button_283288');
    await expect(nextBtn).toBeEnabled();
  });
});

// ====================================================================
// GROUP: ONLINE BANKING
// ====================================================================

// ---------------------
// 1) BY ACCOUNT
// ---------------------
test('Online Banking - Reset by Account', async ({ page }) => {

  allure.parentSuite('Reset Password');
  allure.suite('Online Banking');
  allure.subSuite('By Account');

  await gotoForgotPassword(page);
  await chooseOnlineBanking(page);

  await allure.step('Select By Account', async () => {
    await page.locator('text=By Account').click();
  });

  await allure.step('Fill details', async () => {
    await page.locator('#sms_username').fill('testuser123');
    await page.locator('#mobileNumber').fill('51234567');
    await page.locator('#accountNumber').fill('6789');
  });

  await allure.step('Reset Button Active', async () => {
    const btn = page.locator('button:has-text("Reset Password")');
    await expect(btn).toBeEnabled();
  });
});

// ---------------------
// 2) BY CARD
// ---------------------
test('Online Banking - Reset by Card', async ({ page }) => {

  allure.parentSuite('Reset Password');
  allure.suite('Online Banking');
  allure.subSuite('By Card');

  await gotoForgotPassword(page);
  await chooseOnlineBanking(page);

  await allure.step('Select By Card', async () => {
    await page.locator('text=By Card').click();
  });

  await allure.step('Fill details', async () => {
    await page.locator('#card_username').fill('testuser123');
    await page.locator('#cardNumber').fill('4111111111111111');
    await page.locator('#pin').fill('1234');
    await page.locator('#account_number-001').fill('12/25');
    await page.locator('#newPassphrase').fill('NewPass@123');
    await page.locator('#confirmNewPassphrase').fill('NewPass@123');
  });

  await allure.step('Reset Button Active', async () => {
    const btn = page.locator('button:has-text("Reset Password")');
    await expect(btn).toBeEnabled();
  });
});
