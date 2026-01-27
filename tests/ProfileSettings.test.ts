import { test, expect, chromium } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";
import { ProfileSettingsPage } from '../pages/ProfileSettingsPage';
import { PopupErrorVerifier } from '../Helpers/ErrorPopupVerifiers';
import { PayToMobilePage } from '../pages/PayToMobilePage';


test.describe('Profile Settings - Set Default Currency', { tag: ['@E2E', '@ProfileSettings', '@SIA-48'] }, () => {
  const scenarios = readCsvData('TestData_SetCurrency.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.ScenarioName?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

      const currencyTitleEng = row.UI_English.trim();
      const currencyTitleFrench = row.UI_English.trim();

      const currencySymbol = row.Currency.trim();

      const loginPage = new LoginPage(page);
      const utilityLibraryPage = new utilityLibrary(page);
      const profileSettingsPage = new ProfileSettingsPage(page);
      const bannerVerification = new PopupErrorVerifier(page);
      try {
        // --- LOGIN ---
        await allure.step('Login', async () => {
          await loginPage.goto();
          await loginPage.login("1031410", "Test@1234");
        });
        await allure.step('Navigate to Profile Settings', async () => {
          await utilityLibraryPage.SelectTab(page, 'Settings');
          await utilityLibraryPage.SelectSubMenu(page, 'Profile Settings');
          await waitForSpinnerToDisappear(page);
        });

        await allure.step('Expand Currency Panel', async () => {
          await profileSettingsPage.expandPanel("Currency");
        });

        await allure.step('Select Currency and Save', async () => {
          await profileSettingsPage.SelectCurrencyAndSave(currencyTitleEng,currencyTitleFrench);
          await waitForSpinnerToDisappear(page);
        });
        await allure.step('Verify if request was succesful', async () => {
          await bannerVerification.verifyBannerMessage("Your request has been submitted successfully.");
        });

        await allure.step('Verify default currency in Net Balance on Dashboard Screen', async () => {
          await utilityLibraryPage.SelectTab(page, 'My Accounts');
          const values = await profileSettingsPage.GetAllAccountTypePanelNetBalance();
          for (const value of values) {
            expect(value).toContain(currencySymbol);
          }
        });
      } catch (error) {
        console.error(`Scenario ${index + 1} FAILED: ${row.scenarioName}`);
        console.error(error);
        testInfo.annotations.push({
          type: 'error',
          description: `Scenario ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`
        });
        throw error;
      }

    });
  }

});

test.describe('Profile Settings - Set Default Account', { tag: ['@E2E', '@ProfileSettings', '@SIA-81'] }, () => {
  const scenarios = readCsvData('TestData_SetDefaultAccount.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.ScenarioName?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

      const accountNumber = row.AccountNumber.trim();
      const mobileNumber = row.MobileNumber.trim();

      const loginPage = new LoginPage(page);
      const utilityLibraryPage = new utilityLibrary(page);
      const profileSettingsPage = new ProfileSettingsPage(page);
      const bannerVerification = new PopupErrorVerifier(page);
      const payToMobilePage = new PayToMobilePage(page);

      try {
        // --- LOGIN ---
        await allure.step('Login', async () => {
          await loginPage.goto();
          await loginPage.login("1031410", "Test@1234");
        });
        await allure.step('Navigate to Profile Settings', async () => {
          await utilityLibraryPage.SelectTab(page, 'Settings');
          await utilityLibraryPage.SelectSubMenu(page, 'Profile Settings');
          await waitForSpinnerToDisappear(page);
        });

        await allure.step('Expand SMS Account Panel', async () => {
          await profileSettingsPage.expandPanel("SMS Account");
        });

        await allure.step('Select Account and Save', async () => {
          await profileSettingsPage.SelectAccountAndSave(accountNumber);
          await waitForSpinnerToDisappear(page);
        });
        await allure.step('Verify if request was succesful', async () => {
          await bannerVerification.verifyBannerMessage("Your request has been submitted successfully.");
        });
        await allure.step('Verify default account in Pay to Mobile', async () => {
          await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
          await utilityLibraryPage.SelectSubMenu(page, 'Pay To Mobile');
          await payToMobilePage.enterRecipientMobile(mobileNumber);
          await payToMobilePage.clickSearchUser();
          await waitForSpinnerToDisappear(page);
          const actualValue = await profileSettingsPage.GetCurrentDropdownValue();
          await utilityLibraryPage.VerifyExpectedActual(accountNumber, actualValue);
        });
      } catch (error) {
        console.error(`Scenario ${index + 1} FAILED: ${row.scenarioName}`);
        console.error(error);
        testInfo.annotations.push({
          type: 'error',
          description: `Scenario ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`
        });
        throw error;
      }

    });
  }

});


test(`Profile Settings - Set Default Language`, { tag: ['@E2E', '@ProfileSettings', '@SIA-94'] }, async ({ page }, testInfo) => {

  const loginPage = new LoginPage(page);
  const utilityLibraryPage = new utilityLibrary(page);
  const profileSettingsPage = new ProfileSettingsPage(page);
  const bannerVerification = new PopupErrorVerifier(page);

  let setLanguageVal:string;

  try {
    // --- LOGIN ---
    await allure.step('Login', async () => {
      await loginPage.goto();
      await loginPage.login("1031410", "Test@1234");
    });
    await allure.step('Navigate to Profile Settings', async () => {
      await utilityLibraryPage.SelectTab(page, 'Settings');
      await utilityLibraryPage.SelectSubMenu(page, 'Profile Settings');
      await waitForSpinnerToDisappear(page);
    });
    await allure.step('Expand Language Settings Panel', async () => {
      await profileSettingsPage.expandPanel("Language Settings");
    });

    await allure.step('Select Language and Save', async () => {
      setLanguageVal=await profileSettingsPage.SelectLanguageAndSave();
      await waitForSpinnerToDisappear(page);
    });
    await allure.step('Verify if request was succesful', async () => {
      await bannerVerification.verifyBannerMessage("Your request has been submitted successfully.");
    });
    await allure.step('Verify Account Title for selected language on Dashboard', async () => {
      await utilityLibraryPage.SelectTab(page, 'My Accounts');
      const scenarios = readCsvData('TestData_SetLanguage.csv');
      for (const [index, row] of scenarios.entries()) {
        const languageCheck = row.Language.trim();
        if (languageCheck ===  setLanguageVal)
        {
          const values = await profileSettingsPage.GetAllAccountTitle(row.AccountType);
          expect(values).toContain(row.AccountTitle);       
        }
      }

    });

  } catch (error) {
    console.error(`Scenario: Profile Settings - Set Default Language FAILED`);
    console.error(error);
    testInfo.annotations.push({
      type: 'error',
      description: `Scenario: Profile Settings - Set Default Language FAILED: ${error instanceof Error ? error.message : String(error)}`
    });
    throw error;
  }

});

