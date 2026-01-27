import { test, expect, chromium } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { PayTransfer } from '../pages/PayTransferPage';
import { PopupErrorVerifier } from '../Helpers/ErrorPopupVerifiers';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import * as allure from "allure-js-commons";
import { OtherLocalBankPage } from '../pages/LocalBankTransferPage';


let actualRefID: string;

test.describe('Other Local Bank Transfer - Successful', () => {
    const scenarios = readCsvData('TestData_OtherLocalBankTransfer.csv');
    for (const [index, row] of scenarios.entries()) {
        const scenarioLabel = row.Description?.replace(/\s+/g, ' ').trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {
            const loginPage = new LoginPage(page);
            const myAccount = new MyAccount(page);
            const pay = new PayTransfer(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);
            const olb = new OtherLocalBankPage(page);
            const utilityLibraryPage = new utilityLibrary(page);

            const data = {
                username: row.Username.trim(),
                password: row.Password.trim(),
                transactionType: (row.Transfer_Type || 'Normal'),
                scenarioType: (row.Scenario_Type).trim(),
                fromAccountHint: row.Sender_Account.trim(),
                fromAccountNickName: row.Sender_Nickname.trim(),
                recipientAccount: row.Recipient_Account.trim(),
                amount: row.Amount.trim(),
                beneficiaryName: row.Beneficiary_Name.trim(),
                beneficiaryCode: row.Beneficiary_Code.trim(),
                remarks: row.Remarks.trim(),
                beneficiaryBankText: row.Beneficiary_Bank.trim(),
                currency: 'MUR',
                transactionDate: row.Transaction_Date.trim()

            };
            test.setTimeout(300000);

            try {
                const initialAvailableBal = await allure.step('Login and verify account', async () => {
                    await loginPage.goto();
                    await loginPage.login(row.Username, row.Password);
                    await myAccount.assertMyAccountTabActive();
                    const available = await utilityLibraryPage.CaptureBalance(page, data.fromAccountHint, "CURRENT AND SAVING");
                    return available;

                });
                await allure.step('Navigate to Other Local Bank Transfer', async () => {
                    await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                    await utilityLibraryPage.SelectSubMenu(page, 'Other Local Bank Transfer');
                    await olb.startPayOnce();
                });
                await test.step(`Fill transfer form - ${data.transactionType} transfer`, async () => {
                    await olb.fillTransferForm(data.fromAccountHint, data.transactionType, data.recipientAccount, data.amount, data.beneficiaryName, data.transactionDate, data.remarks, data.beneficiaryBankText);
                    await page.locator("xpath=//button[@id='save_or_pay_beneficiary']").waitFor({ state: 'visible', timeout: 10000 });;
                    await page.locator("xpath=//button[@id='save_or_pay_beneficiary']").click();
                });

                const actualPaymentDate = await utilityLibraryPage.CalculateDateDDMMYYYY(data.transactionDate);

                await allure.step('Validate confirmation dialog details', async () => {
                    await olb.verifyPleaseConfirmDialogDetails(data.fromAccountHint, data.fromAccountNickName, data.beneficiaryName, data.recipientAccount, data.beneficiaryCode, data.amount, data.currency, actualPaymentDate, data.remarks);
                    await page.locator("xpath=//button[@id='BW_button_021029']").waitFor({ state: 'visible', timeout: 10000 });;
                    await page.locator("xpath=//button[@id='BW_button_021029']").click();
                });

                await allure.step('Validate successful dialog details', async () => {
                    actualRefID = await olb.VerifySuccessfulDialogDetails(actualPaymentDate, data.fromAccountHint, data.recipientAccount, data.amount, data.currency, data.remarks);
                });
                await allure.step('Download receipt and verify receipt content', async () => {
                    const maskedFromAccount = await utilityLibraryPage.MaskedAccountNumber(data.fromAccountHint);
                    const maskedToAccount = await utilityLibraryPage.MaskedAccountNumber(data.recipientAccount);
                    const actualPaymentDate1 = await utilityLibraryPage.CalculateDateMonthDDYYYY(data.transactionDate);
                    await olb.verifyReceiptData(maskedFromAccount, maskedToAccount, actualPaymentDate1, data.amount, data.currency, data.remarks, actualRefID, "");
                    await pay.dialog.close();

                });
                await allure.step('Verify amount deduction from debit account', async () => {
                    await utilityLibraryPage.SelectTab(page, 'My Accounts');
                    const finalAvailableBal = await utilityLibraryPage.CaptureBalance(page, data.fromAccountHint, "CURRENT AND SAVING");
                    const availableBalDiff = await utilityLibraryPage.DeductAmount(initialAvailableBal, finalAvailableBal);
                    if (data.transactionType.trim().toLowerCase() === "macss") {
                        const calculatedDeductedAmount = ((parseFloat(data.amount)) + 75);
                        await utilityLibraryPage.VerifyExpectedActual((availableBalDiff.toFixed(2)).toString(), calculatedDeductedAmount.toString());
                    }
                    else {
                        await utilityLibraryPage.VerifyExpectedActual((availableBalDiff.toFixed(2)).toString(), data.amount);
                    }
                });


                await allure.step('Verify details in calendar activity history for debit account', async () => {
                    await waitForSpinnerToDisappear(page);
                    await utilityLibraryPage.VerifyInCalendarActivity('debit', actualPaymentDate, data.fromAccountNickName, data.currency, data.amount, data.remarks);

                });
                await allure.step('Verify details in transaction history screen by ref ID', async () => {
                    await transactionHistoryPage.OpenTransactionHistoryScreen(page, data.fromAccountHint);
                    await transactionHistoryPage.ClickSearchTransactionHistory(page);
                    await transactionHistoryPage.SearchByReferenceID(page, actualRefID);
                    const actualPaymentDate1 = await utilityLibraryPage.CalculateDateMonthDDYYYY(data.transactionDate);
                    await transactionHistoryPage.VerifyTransactionDetails(page, actualPaymentDate1, data.fromAccountNickName, data.fromAccountHint, data.recipientAccount, data.amount, data.currency, data.remarks);
                });
            }
            catch (error) {
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

test.describe('Other Local Bank Transfer - Unsuccessful',() => {
    const scenarios = readCsvData('TestData_OtherLocalBankTransfer_Unsuccessful.csv');
    for (const [index, row] of scenarios.entries()) {
        const scenarioLabel = row.Description.trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {
            const loginPage = new LoginPage(page);
            const myAccount = new MyAccount(page);
            const errorVerification = new PopupErrorVerifier(page);
            const olb = new OtherLocalBankPage(page);
            const utilityLibraryPage = new utilityLibrary(page);
            const data = {
                username: row.Username.trim(),
                password: row.Password.trim(),
                transactionType: (row.Transfer_Type || 'Normal'),
                scenarioType: (row.Scenario_Type).trim(),
                fromAccountHint: row.Sender_Account.trim(),
                recipientAccount: row.Recipient_Account.trim(),
                amount: row.Amount.trim(),
                beneficiaryName: row.Beneficiary_Name.trim(),
                remarks: row.Remarks.trim(),
                beneficiaryBankText: row.Beneficiary_Bank.trim(),
                currency: 'MUR',
                transactionDate: row.Transaction_Date.trim(),
                errMsgACNo: row.ErrMsg_AC_No.trim(),
                errMsgAmount: row.ErrMsg_Amount.trim(),
                errBeneficiaryName: row.ErrMsg_BeneficiaryName.trim(),
                errMsgRemarks: row.ErrMsg_Remarks.trim(),
                errBeneficiaryBank: row.ErrMsg_BeneficiaryBank.trim()


            };
            test.setTimeout(300000);

            try {
                await allure.step('Login and verify account', async () => {
                    await loginPage.goto();
                    await loginPage.login(row.Username, row.Password);
                    await myAccount.assertMyAccountTabActive();
                });
                await allure.step('Navigate to Other Local Bank Transfer', async () => {
                    await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                    await utilityLibraryPage.SelectSubMenu(page, 'Other Local Bank Transfer');
                    await olb.startPayOnce();
                });
                await test.step(`Fill transfer form - ${data.transactionType} transfer`, async () => {
                    await olb.fillTransferForm(data.fromAccountHint, data.transactionType, data.recipientAccount, data.amount, data.beneficiaryName, data.transactionDate, data.remarks, data.beneficiaryBankText);
                    await page.locator("xpath=//button[@id='save_or_pay_beneficiary']").waitFor({ state: 'visible', timeout: 10000 });;
                    await page.locator("xpath=//button[@id='save_or_pay_beneficiary']").click();
                });
                await allure.step('Verification of field validations', async () => {

                    if (data.errMsgACNo.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(olb.errorToAccount, data.errMsgACNo);
                    }
                    if (data.errMsgAmount.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(olb.errorAmount, data.errMsgAmount);
                    }
                    if (data.errBeneficiaryName.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(olb.errorBeneficiaryName, data.errBeneficiaryName);
                    }
                    if (data.errMsgRemarks.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(olb.errorRemarks, data.errMsgRemarks);
                    }
                    if (data.errBeneficiaryBank.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(olb.errorBeneficiaryBank, data.errBeneficiaryBank);
                    }
                });
            }
            catch (error) {
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

test.describe('UI Check for different accounts type', { tag: ['@UI'] },() => {
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
            const olb = new OtherLocalBankPage(page);
            const pay = new PayTransfer(page);


            await allure.step('Login', async () => {
                await loginPage.goto();
                await loginPage.login(username, password);
                await myAccount.assertMyAccountTabActive();

            });
            if (displayOnScreen.toLocaleLowerCase() === 'yes') {
                await allure.step('Verify account display on dashboard', async () => {

                    await utilityLibraryPage.isPresentOnDashboard(page, accountType, accountNum, "Dashboard");
                });
            }
            if (allowDebit.toLocaleLowerCase() === 'yes') {
                await allure.step('Navigate to transfer section', async () => {
                    await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                    await utilityLibraryPage.SelectSubMenu(page, 'Other Local Bank Transfer');
                    await pay.navigation.clickPayBeneficiaryOnce();
                });
                await allure.step('Verify Account in From Account Dropdown', async () => {
                    utilityLibraryPage.CheckAccountInDropdown(page, olb.fromAccountCombo, accountNum);
                });
            }
        });
    }
});