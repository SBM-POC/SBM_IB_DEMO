import { test, expect, chromium } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { ChequeBookPage } from '../pages/ChequeBookPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";

let statementPath:string;

test.describe('SIA-63|Request New Cheque Book',{ tag: ['@E2E','@RequestMoney','@SIA-63'] }, () => {
  const scenarios = readCsvData('TestData_ChequeBook.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

      const username = row.Username.trim();
      const password = row.Password.trim();
      const accountNum = row.Account_Number.trim();
      const customerName = row.Customer_Name.trim();
      const collectiveBranch = row.Collective_Branch.trim();
      const numChequeLeaves = row.Num_Cheque_Leaves.trim();
      const crossType = row.Cross_Type.trim();
      const remarks = row.Remarks.trim();


      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const utilityLibraryPage = new utilityLibrary(page);
      const chequeBookPage = new ChequeBookPage(page);

      // --- LOGIN ---
      await allure.step('Login', async () => {
        await loginPage.goto();
        await loginPage.login(username, password);
      });
      await allure.step('Navigate to Service Request', async () => {
        await utilityLibraryPage.SelectTab(page, 'Service Request');
        await utilityLibraryPage.SelectSubMenu(page, 'Request Cheque Book');
      });

      await allure.step('Fill New Cheque Book Form', async () => {
        await chequeBookPage.filNewChequeBookForm(accountNum,customerName,collectiveBranch,numChequeLeaves,crossType,remarks);
        await chequeBookPage.ClickRequest();
      });

    });
  }

});

