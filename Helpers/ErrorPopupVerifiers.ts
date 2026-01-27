import { Page, expect, Locator } from '@playwright/test';
import * as allure from "allure-js-commons";


export class PopupErrorVerifier {
  constructor(private readonly page: Page) { }

  async verifyErrorMessage(element: Locator, expectedText: string, timeout = 10000): Promise<void> {
    const actualText = (await element.innerText()).trim();
    try {
      await expect(actualText).toBe(expectedText);
      const successMessage = `[SUCCESS]- Expected Result:'${expectedText}' vs Actual Result:'${actualText}'`;
      await allure.attachment(successMessage, "", "text/plain");
    }
    catch (error) {
      const failMessage = `[FAILURE] - Expected Result:'${expectedText}' vs Actual Result:'${actualText}'`;
      await allure.attachment(failMessage, "", "text/plain");
      throw new Error(failMessage);
    }
  }

  async verifyBannerMessage(expectedText: string, timeout = 100000): Promise<void> {
    //const popUpElement = this.page.locator(`xpath=//app-alert-popup//p[contains(text(),'${expectedText}')]`);
    const popUpElement = await this.page.locator(`xpath=//app-alert-popup//p`);
    const actualText = (await popUpElement.innerText()).trim();
    try {
      await expect(actualText).toBe(expectedText);
      const successMessage = `[SUCCESS]- Expected Result:'${expectedText}' vs Actual Result:'${actualText}'`;
      await allure.attachment(successMessage, "", "text/plain");
    }
    catch (error) {
      const failMessage = `[FAILURE] - Expected Result:'${expectedText}' vs Actual Result:'${actualText}'`;
      //await allure.attachment(failMessage, "", "text/plain");
      throw new Error(failMessage);
    }
  }
}


