import { test, expect, chromium } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { PayTransfer } from '../pages/PayTransferPage';
import { TransferFormData } from '../Utils/Types';
import { PopupErrorVerifier } from '../Helpers/ErrorPopupVerifiers';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import * as allure from "allure-js-commons";
import { OtherSBMPage } from '../pages/OtherSBMPage';


let actualRefID: string;

test.describe('Other SBM Account Transfer', { tag: ['@E2E','@OtherSBMAccountTransfer','@SIA-3'] }, () => {
  const scenarios = readCsvData('TestData_OtherSBMTransfer.csv');
  const cleanAccount = (v?: string) => (v ?? '').replace(/'/g, '').trim();

  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.replace(/\s+/g, ' ').trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {
      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const pay = new PayTransfer(page);
      const errorVerification = new PopupErrorVerifier(page);
      const transactionHistoryPage = new TransactionHistoryPage(page);
      const otherSBMPage = new OtherSBMPage(page);
      const utilityLibraryPage = new utilityLibrary(page);

 const data: TransferFormData = {
  senderNickname: row.SenderNickname?.trim(),
  senderAccount: cleanAccount(row.FromAccount),         
  amount: row.Amount?.trim(),
  toAccount: cleanAccount(row.RecipientAccount),         
  remarks: row.Remarks?.trim(),
  currency: row.TransferCurrency?.trim(),
  errMsgAmount: row.ErrorMessageAmount?.trim(),
  errMsgACNo: row.ErrorMessageAccountNo?.trim(),
  errMsgRemarks: row.ErrorMessageRemarks?.trim(),
  errMsgSameAccount: row.ErrorMessagesameAccount?.trim(),
  exchangeRateType: row.ExchangeRateType?.trim(),
  paymentDate: row.TransferDate?.trim()
};

      const otp = row.OTP?.trim();
      const popupError = row.ErrorMessagePopup?.trim();
      const otpError = row.ErrorMessageOTP?.trim();
      const flowType = row.FlowType?.toLowerCase().trim();

      test.setTimeout(300000);

      try {
        const initialAvailableBal = await allure.step('Login and verify account', async () => {
          const testDataUsed = `        
                    - Username:'${row.Username}'`;
                    await allure.attachment("Test Data", testDataUsed, "text/plain");           
          await loginPage.goto();
          await loginPage.login(row.Username, row.Password);
          await myAccount.assertMyAccountTabActive();
          const available = await utilityLibraryPage.CaptureBalance(page, data.senderAccount, "CURRENT AND SAVING");
          return available;

        });

        await allure.step('Navigate to transfer section', async () => {
          await pay.navigation.goToTransferMenu();
          await pay.navigation.selectOtherSbmTransfer();
          await pay.navigation.clickPayBeneficiaryOnce();
        });

        await allure.step('Fill form and submit', async () => {
          await pay.formHandler.fill(data);
          await otherSBMPage.btnPay.click();
        });

        switch (true) {
          case !!popupError:
            await allure.step('Validate popup error', async () => {
              await page.locator("xpath=//button[@id='BW_button_021029']").click();
              await errorVerification.verifyBannerMessage(popupError);
            });
            break;
          case flowType === 'happy':
            await allure.step('Validate confirmation dialog details', async () => {
              const actualPaymentDate = await utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate);
              await pay.confirmationVerifier.verifyPleaseConfirmDialogDetailsNew(data.senderNickname, data.senderAccount, data.toAccount, data.currency, data.amount, actualPaymentDate, data.remarks);
              await otherSBMPage.btnConfirmPay.click();
            });
            await allure.step('Validate successful dialog details', async () => {
              actualRefID = await pay.confirmationVerifier.verifySuccessfulDialogDetails(data.senderAccount, data.toAccount, data.amount, data.currency, data.remarks);
            });
            await allure.step('Download receipt and verify receipt content', async () => {  
              const maskedFromAccount= await utilityLibraryPage.MaskedAccountNumber(data.senderAccount);
              const maskedToAccount= await utilityLibraryPage.MaskedAccountNumber(data.toAccount);  
              const actualPaymentDate = await utilityLibraryPage.CalculateDateMonthDDYYYY(data.paymentDate);                
              await otherSBMPage.verifyReceiptData(maskedFromAccount,maskedToAccount,actualPaymentDate, data.amount, data.currency, data.remarks,actualRefID,"");
              await pay.dialog.close();

            });
            await allure.step('Verify amount deduction from debit account', async () => {
              await utilityLibraryPage.SelectTab(page, 'My Accounts');
              const finalAvailableBal = await utilityLibraryPage.CaptureBalance(page, data.senderAccount, "CURRENT AND SAVING");
              const availableBalDiff = await utilityLibraryPage.DeductAmount(initialAvailableBal,finalAvailableBal);
              await utilityLibraryPage.VerifyExpectedActual((availableBalDiff.toFixed(2)).toString(), data.amount);
            
            });

            await allure.step('Verify details in transaction history screen by ref ID', async () => {
              await transactionHistoryPage.OpenTransactionHistoryScreen(page, data.senderAccount);
              await transactionHistoryPage.ClickSearchTransactionHistory(page);
              await transactionHistoryPage.SearchByReferenceID(page, actualRefID);
              const actualPaymentDate = await utilityLibraryPage.CalculateDateMonthDDYYYY(data.paymentDate);
              await transactionHistoryPage.VerifyTransactionDetails(page, actualPaymentDate, data.senderNickname, data.senderAccount, data.toAccount, data.amount, data.currency, data.remarks);
            });            
            await allure.step('Verify details in calendar activity history for debit account', async () => {
              await utilityLibraryPage.SelectTab(page, 'My Accounts');
              const actualPaymentDate = await utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate);
              await waitForSpinnerToDisappear(page);
              await utilityLibraryPage.VerifyInCalendarActivity('debit', actualPaymentDate, data.senderNickname, data.currency, data.amount, data.remarks);
            });
            break;
          case flowType === 'unhappy':
            await allure.step('Verification of field validations', async () => {
              if (data.errMsgAmount.trim().length > 0) {
                await errorVerification.verifyErrorMessage(otherSBMPage.errorAmount, data.errMsgAmount);
              }
              if (data.errMsgACNo.trim().length > 0) {
                await errorVerification.verifyErrorMessage(otherSBMPage.errorToAccount, data.errMsgACNo);
              }
              if (data.errMsgRemarks.trim().length > 0) {
                await errorVerification.verifyErrorMessage(otherSBMPage.errorRemarks, data.errMsgRemarks);
              }
              if (data.errMsgSameAccount.trim().length > 0) {
                await errorVerification.verifyErrorMessage(otherSBMPage.errorFromAccount, data.errMsgSameAccount);
              }
            });
            break;

          case !!otp:
            await allure.step('Submit OTP after failed transfer', async () => {
              await pay.confirmationVerifier.verifyPleaseConfirmDialogDetails(data);
              await pay.otpHandler.submitOtp(otp);
            });

            if (otpError) {
              await allure.step('Validate OTP error message', async () => {
                const otpErrorLocator = page.locator('mat-error', { hasText: otpError });
                await expect(otpErrorLocator).toBeVisible();
              });
            }

            await allure.step('Cancel dialog after failed transfer', async () => {
              await pay.dialog.cancel();
            });
            break;

          default:
            console.log(`[Scenario ${index + 1}] No specific steps triggered — basic transfer flow only.`);
        }

        await allure.step('Logout', async () => {
          await myAccount.logout();
        });
      } catch (error) {
        console.error(`Scenario ${index + 1} FAILED: ${row.Description}`);
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


test.describe('UI Check for different accounts type', { tag: ['@UI','@OtherSBMAccountTransfer','@SIA-35'] }, () => {
  const scenarios = readCsvData('TestData_Transfer_UI.csv');
  for (const [index, row] of scenarios.entries()) {
    const scenarioLabel = row.Description?.trim();
    test(`Scenario ${index + 1}: ${scenarioLabel}`,{ tag: ['@SQP-1657'] }, async ({ page }, testInfo) => {

      const username = row.Username.trim();
      const password = row.Password.trim();
      const accountType = row.AccountType.trim();
      const accountNum = row.Account.trim();
      const displayOnScreen = row.DisplayOnScreen.trim();
      const allowDebit = row.AllowDebit.trim();

      const loginPage = new LoginPage(page);
      const myAccount = new MyAccount(page);
      const utilityLibraryPage = new utilityLibrary(page);
      const otherSBMPage = new OtherSBMPage(page);
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
          await utilityLibraryPage.SelectSubMenu(page, 'Other SBM Account Transfer');
          await pay.navigation.clickPayBeneficiaryOnce();
          await waitForSpinnerToDisappear(page);
        });

        // --- ACCOUNT VERIFICATION ---
        if (allowDebit.toLowerCase() === 'yes') {
          await allure.step('Verify Account in From Account Dropdown', async () => {
            await utilityLibraryPage.CheckAccountInDropdown(page, otherSBMPage.ddlFromAccount, accountNum);
          });
        }
        if (allowDebit.toLowerCase() === 'no') {
          await allure.step('Verify Account in From Account Dropdown', async () => {
            await utilityLibraryPage.CheckAccountNotInDropdown(page, otherSBMPage.ddlFromAccount, accountNum);
          });
        }
      }

      if (displayOnScreen.toLowerCase() === 'no') {      
        await utilityLibraryPage.isNotPresentOnDashboard(page, accountType, accountNum, "Dashboard"); 
      }
    });
  }

});





