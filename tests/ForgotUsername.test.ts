import { test, expect } from '@playwright/test';
import { ForgotUsernamePage } from '../pages/forgotUsernamePage';
import * as allure from "allure-js-commons";

test.describe('Forgot Username', () => {

  let forgotPage: ForgotUsernamePage;

  test.beforeEach(async ({ page }) => {
    forgotPage = new ForgotUsernamePage(page);
    allure.parentSuite('Forgot Username');
  });

  // =========================================================
  // 1) FIELD VALIDATION — MOBILE NUMBER
  // =========================================================
  test('Mobile number: digits only allowed', async () => {
    allure.suite('Field Validation');
    allure.subSuite('Mobile Number');

    await forgotPage.goto();

    const mobile = forgotPage.mobileNumberField();

    await allure.step('Enter letters → should not be accepted', async () => {
      await mobile.fill('abcXYZ');
      await expect(mobile).toHaveValue('');
    });

    await allure.step('Enter digits → should be accepted', async () => {
      await mobile.fill('12345');
      await expect(mobile).toHaveValue('12345');
    });
  });

  test('Mobile number: auto-add +230 when valid Mauritius number', async () => {
    allure.suite('Field Validation');
    allure.subSuite('Mobile Auto Prefix');

    await forgotPage.goto();

    await forgotPage.enterMobileNumber('51234567');

    await allure.step('Verify +230 is added automatically', async () => {
      await expect(forgotPage.mobileNumberField()).toHaveValue('+23051234567');
    });
  });

  test('Mobile number: country code required when number invalid for auto-add', async () => {
    allure.suite('Field Validation');
    allure.subSuite('Manual Prefix Requirement');

    await forgotPage.goto();

    await forgotPage.enterMobileNumber('222');

    await forgotPage.sendUsernameButton().click();

    await forgotPage.expectMobileError('Valid mobile number is required with a country code');
  });

  // =========================================================
  // 2) FIELD VALIDATION — LAST 4 DIGITS
  // =========================================================
  test('Last 4 digits: allow digits only', async () => {
    allure.suite('Field Validation');
    allure.subSuite('Last 4 Digits');

    await forgotPage.goto();

    const acc4 = forgotPage.last4DigitsField();

    await allure.step('Enter letters → not accepted', async () => {
      await acc4.fill('abcd');
      await expect(acc4).toHaveValue('');
    });

    await allure.step('Enter digits → accepted', async () => {
      await acc4.fill('1234');
      await expect(acc4).toHaveValue('1234');
    });
  });

  test('Last 4 digits: max limit 4 digits', async () => {
    allure.suite('Field Validation');
    allure.subSuite('Digit Limit');

    await forgotPage.goto();

    const acc4 = forgotPage.last4DigitsField();

    await allure.step('Enter more than 4 digits', async () => {
      await acc4.fill('123456');
      await expect(acc4).toHaveValue('1234');
    });
  });

  test('Error message: Enter last 4 digits when missing/invalid', async () => {
    allure.suite('Error Messages');
    allure.subSuite('Last 4 Digits');

    await forgotPage.goto();

    await forgotPage.enterMobileNumber('+23051234567');
    await forgotPage.enterLast4Digits('44');
    await forgotPage.enterPassword('Valid@123');

    await forgotPage.sendUsernameButton().click();

    await forgotPage.expectLast4DigitsError('Enter last 4 digits of your account number');
  });

  // =========================================================
  // 3) FIELD VALIDATION — PASSWORD
  // =========================================================
  test('Password: must meet criteria', async () => {
    allure.suite('Field Validation');
    allure.subSuite('Password Criteria');

    await forgotPage.goto();

    await forgotPage.enterMobileNumber('+23051234567');
    await forgotPage.enterLast4Digits('4444');
    await forgotPage.enterPassword('123'); // Invalid password

    await forgotPage.sendUsernameButton().click();

    await forgotPage.expectPasswordError('Password criteria not met. Tap on the info icon for more details.');
  });

  // =========================================================
  // 4) BUTTON STATE
  // =========================================================
  test('Send Username button enabled only when all fields valid', async () => {
    allure.suite('Button State');

    await forgotPage.goto();

    const mobile = forgotPage.mobileNumberField();
    const acc4 = forgotPage.last4DigitsField();
    const pwd = forgotPage.passwordField();
    const btn = forgotPage.sendUsernameButton();

    await expect(btn).toBeDisabled();

    await mobile.fill('+23051234567');
    await expect(btn).toBeDisabled();

    await acc4.fill('1234');
    await expect(btn).toBeDisabled();

    await pwd.fill('ValidPass@123');
    await expect(btn).toBeEnabled();
  });

  // =========================================================
  // 5) HAPPY PATH — SUCCESSFUL FORGOT USERNAME
  // =========================================================
  test('Forgot Username - Successful Flow', async () => {
    allure.suite('Happy Path');

    await forgotPage.goto();

    await forgotPage.enterMobileNumber('51234567'); // triggers +230
    await forgotPage.enterLast4Digits('1234');
    await forgotPage.enterPassword('ValidPass@123');

    const btn = forgotPage.sendUsernameButton();
    await expect(btn).toBeEnabled();

    await forgotPage.clickSendUsername();

    // Validate final URL
    await forgotPage.expectURL(/forgotusername\/confirmation/);
  });

});
