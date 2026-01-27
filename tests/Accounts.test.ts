import { test, expect, chromium } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";

let statementPath:string;

test.describe('Verify Accounts Details for different Account types', () => {
  const scenarios = readCsvData('TestData_AccountsTypes.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

      const username = row.Username.trim();
      const password = row.Password.trim();
      const accountType = row.AccountType.trim();
      const accountNum = row.Account.trim();
      const accountNickname = row.AccountNickname.trim();


      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const transactionHistoryPage = new TransactionHistoryPage(page);

      // --- LOGIN ---
      await allure.step('Login', async () => {
        await loginPage.goto();
        await loginPage.login(username, password);
      });
      await allure.step('Open Acounts View Screen', async () => {
        await transactionHistoryPage.OpenTransactionHistoryScreen(page, accountNum);
      });

      await allure.step('Retrieve Account Details', async () => {
        await transactionHistoryPage.GetAccountDetails(page, accountType);
      });

    });
  }

});

test.describe('Verify Transaction History Screen for different Account types', () => {
  const scenarios = readCsvData('TestData_AccountsTypes.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

      const username = row.Username.trim();
      const password = row.Password.trim();
      const accountType = row.AccountType.trim();
      const accountNum = row.Account.trim();
      const accountNickname = row.AccountNickname.trim();


      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const transactionHistoryPage = new TransactionHistoryPage(page);

      // --- LOGIN ---
      await allure.step('Login', async () => {
        await loginPage.goto();
        await loginPage.login(username, password);
        await myAccount.assertMyAccountTabActive();

      });
      await allure.step('Open Transaction History Screen', async () => {
        await transactionHistoryPage.OpenTransactionHistoryScreen(page, accountNum);
      });

      await allure.step('Verify Transaction History Screen', async () => {       
        await transactionHistoryPage.VerifyTransactionHistoryScreen(page,accountType, accountNickname,accountNum);

      });

    });
  }

});

test.describe('Verify Search functionality for different account types', () => {
  const scenarios = readCsvData('TestData_AccountsTypes_Search.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

      const username = row.Username.trim();
      const password = row.Password.trim();
      const accountType = row.AccountType.trim();
      const accountNum = row.Account.trim();
      const text = row.Text.trim();
      const fromDate = row.FromDate.trim();
      const toDate = row.ToDate.trim();
      const period = row.Period.trim();
      const transactionType = row.TransactionType.trim();
      const fromAmount = row.FromAmount.trim();
      const toAmount = row.ToAmount.trim();
      const bannerMessage = row.BannerMessage.trim();


      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const transactionHistoryPage = new TransactionHistoryPage(page);

      // --- LOGIN ---
      await allure.step('Login', async () => {
        await loginPage.goto();
        await loginPage.login(username, password);
        await myAccount.assertMyAccountTabActive();
      });
      await allure.step('Open Transaction History Screen', async () => {
        await transactionHistoryPage.OpenTransactionHistoryScreen(page, accountNum);
        await transactionHistoryPage.ClickSearchTransactionHistory(page);
      });

      if (text.trim().length > 0) {
        await allure.step('Enter Narrative Text', async () => {
          await transactionHistoryPage.SearchByText(page, text);
        });
      }
      if (fromDate.trim().length > 0) {
        await allure.step('Enter Dates', async () => {
          await transactionHistoryPage.SearchByDate(page, fromDate, toDate);
        });
      }
      if (period.trim().length > 0) {
        await allure.step('Select Period', async () => {
          await transactionHistoryPage.SearchByPeriod(page, period);

        });
      }
            
      if (transactionType.trim().length > 0) {
        await allure.step('Select Debit or Credit', async () => {
          await transactionHistoryPage.SearchByTransactionType(page, transactionType);

        });
      }
      if (fromAmount.trim().length > 0) {
        await allure.step('Enter Amount', async () => {
          await transactionHistoryPage.SearchByAmount(page,fromAmount,toAmount);

        });
      }
      await transactionHistoryPage.ClickSearch(page);
              
      await allure.step('Verify in transaction history results', async () => {
          await transactionHistoryPage.VerifyInSearchResults(page,text,fromDate,toDate,period,transactionType,fromAmount,toAmount);
        });



    });
  }
});

test.describe('Accounts Statements for difference account type', () => {
  const scenarios = readCsvData('TestData_AccountStatements.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {
          
       const username = row.Username.trim();
      const password = row.Password.trim();
      const accountType = row.AccountType.trim();
      const accountNum = row.Account.trim();
      const fromDate = row.FromDate.trim();
      const toDate = row.ToDate.trim();

      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const transactionHistoryPage = new TransactionHistoryPage(page);

      // --- LOGIN ---
      await allure.step('Login', async () => {
        await loginPage.goto();
        await loginPage.login(username, password);
        await myAccount.assertMyAccountTabActive();
      });
      await allure.step('Open Transaction History Screen', async () => {
        await transactionHistoryPage.OpenTransactionHistoryScreen(page, accountNum);
        await transactionHistoryPage.ClickSearchTransactionHistory(page);
      });

      await allure.step('Enter Dates', async () => {
        await transactionHistoryPage.SearchByDate(page, fromDate, toDate);
        await transactionHistoryPage.ClickSearch(page);
      });
      await allure.step('Download Statement in PDF', async () => {
        statementPath = await transactionHistoryPage.DownloadStatement(page, "PDF");
      });
      await allure.step('Verify Statement Details', async () => {
        const table= await transactionHistoryPage.VerifyCASAStatement(statementPath);
        const message =`
        -Account Number: ${table.accountNumber}
        -Date of Statement: ${table.dateOfStatement}
        -Statement Period: ${table.statementPeriod}
        -Account Name: ${table.accountName}
        -Account Holder: ${table.accountHolder}
        -Opening Balance: ${table.openingBalance}
        -Closing Balance: ${table.closingBalance}
        -Number of Pages: ${table.numberOfPages}`;
        await allure.attachment("Account Statement Details",message ,"text/plain");                
      });
      
    });
  }
});