import { test } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { PreLoginPage } from '../pages/PreLoginPage';
import * as allure from 'allure-js-commons';

test.describe('Pre-Login UI Validation Flow', () => {

  test('Validate UI Elements before Login', async ({ page }) => {
    page.setDefaultTimeout(1200000);
    page.setDefaultNavigationTimeout(1200000);

    const loginPage = new LoginPage(page);
    const preLoginPage = new PreLoginPage(page);

    await loginPage.goto();

    try {
      await allure.step('Validate UAT Promo Cards', async () => {
        await preLoginPage.validatePromoCards([
          'Sign up for eStatements',
          'Mortgages for all',
          'Your Personal Finance'
        ]);
      });

      await allure.step('Validate Footer Links', async () => {
        await preLoginPage.validateFooterLinks([
          'Privacy',
          'Legal',
          'Help',
          'Contact Us',
          'Exchange Rates'
        ]);
      });

      await allure.step('Validate Contact Us Page & Extract Details', async () => {
        await preLoginPage.openContactUs();

        const extracted = await preLoginPage.extractContactUsDetails();

        for (const [key, value] of Object.entries(extracted)) {
          await allure.attachment(
            key,
            typeof value === 'string'
              ? value
              : JSON.stringify(value, null, 2),
            { contentType: typeof value === 'string' ? 'text/plain' : 'application/json' }
          );
        }
      });

      await allure.step('Validate Back to Login Navigation', async () => {
        await preLoginPage.backToLogin();
      });

    } catch (error) {
      throw new Error(`❌ Pre-login UI scenario failed.\n${error}`);
    }
  });

});
