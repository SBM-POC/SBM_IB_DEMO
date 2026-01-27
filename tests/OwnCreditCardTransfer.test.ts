// creditCardPayment.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { PayTransfer } from '../pages/PayTransferPage';
import { PayOwnCreditCardPage } from '../pages/PayOwnCreditCardPage';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import { PopupErrorVerifier } from '../Helpers/ErrorPopupVerifiers';
import { readCsvData } from '../Utils/readCsvData';
import * as allure from "allure-js-commons";
import { utilityLibrary } from '../Utils/utilityLibrary';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';

let actualRefID: string;
let exchangeRatesArray : number;
let calculatedAmount : number;

test.describe('SIA-8|Pay Own Credit Card',  { tag: ['@E2E','@OwnCreditCardTransfer','@SIA-8'] },() => {
  const scenarios = readCsvData('TestData_CreditCard.csv');
  for (const [index, row] of scenarios.entries()) {
    const label = row.ScenarioName?.replace(/\s+/g, ' ').trim();
    const flowType = row.FlowType?.toLowerCase().trim();

    test(`Scenario ${index + 1}: ${label}`, async ({ page }, testInfo) => {
      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const pay = new PayTransfer(page);
      const creditCardPaymentPage = new PayOwnCreditCardPage(page);
      const errorVerification = new PopupErrorVerifier(page);
      const utilityLibraryPage = new utilityLibrary(page);
      const transactionHistoryPage = new TransactionHistoryPage(page);

      const data = {
        fromAccount: row.FromAccount?.trim(),
        fromAccountCurrency: row.ACCurrency.trim(),
        fromAccountNickname: row.ACNickname.trim(),
        toAccount: row.CreditCard?.trim(),
        creditCardName: row.CCNickName?.trim(),
        creditCardCurrency: row.CCCurrency?.trim(),
        amount: row.TransferAmount?.trim(),
        remarks: row.Remarks?.trim(),
        errMsgAmount: row.ErrorMessageAmount?.trim(),
        errMsgCCNo: row.ErrorMessageCCNo?.trim(),
        errMsgRemarks: row.ErrorMessageRemarks?.trim(),
        paymentDate: row.TransactionDate.trim(),
        exchangeRateType: row.ExchangeRateTT.trim()
    
      };

      test.setTimeout(300000);

      try {
        const initialAvailableBal = await allure.step('Login and verify account', async () => {
          await loginPage.goto();
          await loginPage.login(row.Username, row.Password);
          await myAccount.assertMyAccountTabActive();
          const available = await utilityLibraryPage.CaptureBalance(page, data.fromAccount, "CURRENT AND SAVING");
          if (row.ExchangeRateTT.trim().length > 0) {
            exchangeRatesArray = await utilityLibraryPage.RetrieveExchangeRate(page,data.fromAccountCurrency,data.exchangeRateType);;
            await utilityLibraryPage.SelectTab(page, 'My Accounts');
          }
          return available;
        });

        await allure.step('Navigate to Pay Own Credit Card', async () => {
          await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
          await utilityLibraryPage.SelectSubMenu(page, 'Pay Own Credit Card');

        });
        await allure.step('Fill Credit Card payment form and Proceed for Confirmation', async () => {
          await creditCardPaymentPage.fillCreditCardTransferForm(data.fromAccount, data.toAccount, data.amount, data.remarks);
          await creditCardPaymentPage.nextButton.waitFor({ state: 'visible'});
          await creditCardPaymentPage.nextButton.click();

        });
        if (flowType === 'happy') {
          if (data.exchangeRateType.trim().length > 0) {
          calculatedAmount = await utilityLibraryPage.CalculateAmountExchangeRate(data.exchangeRateType, exchangeRatesArray, data.amount);
          }       
          const actualPaymentDate = await utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate);

          await allure.step('Validate confirmation details', async () => {
            await creditCardPaymentPage.verifyPleaseConfirmDialogDetails(data.fromAccount, data.fromAccountNickname, data.toAccount, data.creditCardName, data.amount, data.creditCardCurrency, "EXCHANGERATE", actualPaymentDate, data.remarks)
            await creditCardPaymentPage.clickShowAmountNext();
          });

          await allure.step('Verify Successful Dialog Details', async () => {
            actualRefID = await creditCardPaymentPage.verifySuccessfulDialogDetails(data.fromAccount, data.fromAccountCurrency, data.toAccount, data.creditCardCurrency, data.amount, actualPaymentDate, data.remarks);
          });

          await allure.step('Download receipt and verify receipt content', async () => {
            const maskedFromAccount = await utilityLibraryPage.MaskedAccountNumber(data.fromAccount);
            const maskedToAccount = await utilityLibraryPage.MaskedAccountNumber(data.toAccount);
            const actualPaymentDate = await utilityLibraryPage.CalculateDateMonthDDYYYY(data.paymentDate);
            await creditCardPaymentPage.verifyReceiptData(maskedFromAccount, maskedToAccount, actualPaymentDate, data.amount, data.creditCardCurrency, data.remarks, actualRefID);
          });  

          await allure.step('Verify amount deduction from debit via search by ref ID', async () => {
            await utilityLibraryPage.SelectTab(page, 'My Accounts');
            const finalAvailableBal= await utilityLibraryPage.CaptureBalance(page, data.fromAccount, "CURRENT AND SAVING");
            const availableBalDiff = await utilityLibraryPage.DeductAmount(initialAvailableBal, finalAvailableBal);

            if (data.exchangeRateType.trim().length > 0) {
              await utilityLibraryPage.VerifyExpectedActual((availableBalDiff.toFixed(2)).toString(), (calculatedAmount.toFixed(2)).toString());
            }
            else {
              await utilityLibraryPage.VerifyExpectedActual((availableBalDiff.toFixed(2)).toString(), data.amount);
            }
          });
          await allure.step('Verify details in calendar activity history for debit account', async () => {
            await waitForSpinnerToDisappear(page);

            if (data.exchangeRateType.trim().length > 0) {
              await utilityLibraryPage.VerifyInCalendarActivity('debit', actualPaymentDate, data.fromAccountNickname, data.fromAccountCurrency, calculatedAmount.toString(), data.remarks);
            }
            else {
              await utilityLibraryPage.VerifyInCalendarActivity('debit', actualPaymentDate, data.fromAccountNickname, data.fromAccountCurrency, data.amount, data.remarks);
            }

          });
          await allure.step('Verify details in transaction history screen by ref ID', async () => {
            await transactionHistoryPage.OpenTransactionHistoryScreen(page, data.fromAccount);
            await transactionHistoryPage.ClickSearchTransactionHistory(page);
            await transactionHistoryPage.SearchByReferenceID(page, actualRefID);
            const actualPaymentDate1 = await utilityLibraryPage.CalculateDateMonthDDYYYY(data.paymentDate);
            await transactionHistoryPage.VerifyTransactionDetails(page, actualPaymentDate1, data.fromAccountNickname, data.fromAccount, data.toAccount, data.amount, data.fromAccountCurrency, data.remarks);
          });
        }
        if (flowType === 'unhappy') {
          if (row.Err_Popup.trim().length > 0) {
            await test.step('Validate popup error message', async () => {
              await errorVerification.verifyBannerMessage(row.Err_Popup);
            });
          }
          else {
            await test.step('Verification of field validations', async () => {

              if (data.errMsgAmount.trim().length > 0) {
                await errorVerification.verifyErrorMessage(creditCardPaymentPage.errorAmount, data.errMsgAmount);
              }
              if (data.errMsgCCNo.trim().length > 0) {
                await errorVerification.verifyErrorMessage(creditCardPaymentPage.errorToAccount, data.errMsgCCNo);
              }
              if (data.errMsgRemarks.trim().length > 0) {
                await errorVerification.verifyErrorMessage(creditCardPaymentPage.errorRemarks, data.errMsgRemarks);
              }


            });
          }

        }
        await test.step('Logout after transaction', async () => {
          await myAccount.logout();
        });

      } catch (error) {
        testInfo.annotations.push({
          type: 'error',
          description: `Scenario ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`
        });
        throw error;
      }
    });
  }
});


test.describe('SIA-54|UI Check for different accounts type', { tag: ['@UI','@OwnCreditCardTransfer','@SIA-54'] }, () => {
  const scenarios = readCsvData('TestData_Transfer_UI.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

      const username = row.Username.trim();
      const password = row.Password.trim();
      const accountType = row.AccountType.trim();
      const accountNum = row.Account.trim();
      const displayOnScreen = row.DisplayOnScreen.trim();
      const allowDebit = row.AllowDebit.trim();

      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const utilityLibraryPage = new utilityLibrary(page);
      const creditCardPaymentPage = new PayOwnCreditCardPage(page);
      const pay = new PayTransfer(page);

      // --- LOGIN ---
      await allure.step('Login', async () => {
        await loginPage.goto();
        await loginPage.login(username, password);
        await myAccount.assertMyAccountTabActive();

      });
      // --- DASHBOARD VERIFICATION ---
      if (displayOnScreen.toLowerCase() === 'yes') {
        await allure.step('Verify account display on dashboard', async () => {

          await utilityLibraryPage.isPresentOnDashboard(page, accountType, accountNum, "Dashboard");
        });

        // --- NAVIGATION ---
        await allure.step('Navigate to transfer section', async () => {
          await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
          await utilityLibraryPage.SelectSubMenu(page, 'Pay Own Credit Card');
          await waitForSpinnerToDisappear(page);
        });

        // --- ACCOUNT VERIFICATION ---
        if (allowDebit.toLowerCase() === 'yes') {
          await allure.step('Verify Account in From Account Dropdown', async () => {
            await utilityLibraryPage.CheckAccountInDropdown(page, creditCardPaymentPage.ddlFromAccount, accountNum);
          });
        }
        if (allowDebit.toLowerCase() === 'no') {
          await allure.step('Verify Account in From Account Dropdown', async () => {
            await utilityLibraryPage.CheckAccountNotInDropdown(page, creditCardPaymentPage.ddlFromAccount, accountNum);
          });
        }
      }

      if (displayOnScreen.toLowerCase() === 'no') {
        await utilityLibraryPage.isNotPresentOnDashboard(page, accountType, accountNum, "Dashboard");
      }
    });
  }

});



