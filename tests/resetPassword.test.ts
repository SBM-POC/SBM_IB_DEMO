import { test } from '@playwright/test';
import { ResetPasswordPage } from '../pages/resetPasswordPage';
import * as allure from "allure-js-commons";


test.describe('Reset Password Flow', () => {

  test('Digital Wallet - Reset', async ({ page }) => {
    allure.parentSuite('Reset Password');
    allure.suite('Digital Wallet');

    const resetPage = new ResetPasswordPage(page);

    await resetPage.gotoForgotPassword('testuser123');
    await resetPage.chooseDigitalWallet();
    await resetPage.fillDigitalWalletDetails('walletUser001', '58123456');
    await resetPage.verifyResetButtonEnabled('#BW_button_283288');
  });

  test('Online Banking - Reset by Account', async ({ page }) => {
    allure.parentSuite('Reset Password');
    allure.suite('Online Banking');
    allure.subSuite('By Account');

    const resetPage = new ResetPasswordPage(page);

    await resetPage.gotoForgotPassword('testuser123');
    await resetPage.chooseOnlineBanking();
    await resetPage.selectByAccount();
    await resetPage.fillOnlineBankingByAccount(
      'testuser123',
      '51234567',
      '6789'
    );
    await resetPage.verifyResetButtonEnabled(
      'button:has-text("Reset Password")'
    );
  });

  test('Online Banking - Reset by Card', async ({ page }) => {
    allure.parentSuite('Reset Password');
    allure.suite('Online Banking');
    allure.subSuite('By Card');

    const resetPage = new ResetPasswordPage(page);

    await resetPage.gotoForgotPassword('testuser123');
    await resetPage.chooseOnlineBanking();
    await resetPage.selectByCard();
    await resetPage.fillOnlineBankingByCard({
      username: 'testuser123',
      cardNumber: '4111111111111111',
      pin: '1234',
      accountExpiry: '12/25',
      newPassphrase: 'NewPass@123',
      confirmPassphrase: 'NewPass@123'
    });
    await resetPage.verifyResetButtonEnabled(
      'button:has-text("Reset Password")'
    );
  });

});
