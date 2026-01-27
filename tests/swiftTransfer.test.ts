import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { SwiftTransferPage, SwiftTransferFormData, SwiftTransferErrorData } from '../pages/swiftTransferPage';
import { readCsvData } from '../Utils/readCsvData';
import * as allure from "allure-js-commons";
import { utilityLibrary } from '../Utils/utilityLibrary';
import { MyAccount } from '../pages/MyAccountPage';
import { PayTransfer } from '../pages/PayTransferPage';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import { PopupErrorVerifier } from '../Helpers/ErrorPopupVerifiers';

const rows: any[] = readCsvData('TestData_SwiftTransfer.csv');

// ============================================================================
//  POSITIVE SCENARIOS
// ============================================================================
test.describe('SIA-21|SWIFT Transfer Positive Scenarios (CSV)', { tag: ['@E2E', '@SwiftTransfer', '@Positive', '@SIA-21'] }, () => {
    const positiveRows = rows.filter(r => String(r.Flow ?? '').toLowerCase().trim() === 'positive');
    for (const [index, row] of positiveRows.entries()) {
        const scenarioLabel = row.ScenarioName?.replace(/\s+/g, ' ').trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {
            const loginPage = new LoginPage(page);
            const swiftPage = new SwiftTransferPage(page);
            const utilityLibraryPage = new utilityLibrary(page);
            const myAccount = new MyAccount(page);
            const pay = new PayTransfer(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);
            const data: SwiftTransferFormData = {
                fromAccountNumber: row.FromAccountNumber,
                currency: row.Currency,
                remittanceAmount: row.RemittanceAmount,
                beneficiaryCountry: row.BeneficiaryCountry,
                beneficiaryAccountIban: row.BeneficiaryAccountIban,
                beneficiaryName: row.BeneficiaryName,
                beneficiaryAddress1: row.BeneficiaryAddress1,
                beneficiaryAddress2: row.BeneficiaryAddress2,
                beneficiaryBankBic: row.BeneficiaryBankBic,
                beneficiaryBankName: row.BeneficiaryBankName,
                beneficiaryBankAddress: row.BeneficiaryBankAddress,
                intermediaryBankBic: row.IntermediaryBankBic,
                intermediaryBankName: row.IntermediaryBankName,
                chargeOption: row.ChargeOption,
                remarks: row.Remarks,
            };

            try {
                // -----------------------------------------------------------
                // 1️⃣ LOGIN + CAPTURE INITIAL BALANCE
                // -----------------------------------------------------------
                const initialAvailableBal = await allure.step('Login and verify account', async () => {
                    await loginPage.goto();
                    await loginPage.login(row.Username, row.Password);
                    await myAccount.assertMyAccountTabActive();
                    const available = await utilityLibraryPage.CaptureBalance(page, data.fromAccountNumber, "CURRENT AND SAVING");
                    return available;
                });
                // -----------------------------------------------------------
                // 2️⃣ NAVIGATION 
                // -----------------------------------------------------------               
                await allure.step('Navigate to swift transfer section', async () => {
                    await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                    await utilityLibraryPage.SelectSubMenu(page, 'SWIFT Transfer');
                    await pay.navigation.clickPayBeneficiaryOnce();
                    await waitForSpinnerToDisappear(page);
                });
                // -----------------------------------------------------------
                // 3️⃣ FILL FORM
                // -----------------------------------------------------------
                await allure.step('Fill form and submit', async () => {
                    await swiftPage.fillForm(data);
                    await swiftPage.btnPay.click();
                });
                // -----------------------------------------------------------
                // 4️⃣ SUBMIT + ASSERT CONFIRMATION DIALOG
                // -----------------------------------------------------------
                await test.step('Submit (assert confirmation dialog)', async () => {
                    await swiftPage.VerifyConfirmationDialog(data);
                    await swiftPage.btnConfirmPay.click();
                });
                let actualRefID: string;
                await allure.step('Validate successful dialog details', async () => {
                    actualRefID = await swiftPage.VerifySwiftSuccessDialog(data);
                    await swiftPage.btnCloseDialog.click();
                });
                // -----------------------------------------------------------
                // 5️⃣ VERIFY BALANCE DEDUCTION
                // -----------------------------------------------------------
                await allure.step('Verify amount deduction from debit account', async () => {
                    await utilityLibraryPage.SelectTab(page, 'My Accounts');
                    const finalAvailableBal = await utilityLibraryPage.CaptureBalance(page, data.fromAccountNumber, "CURRENT AND SAVING");
                    const availableBalDiff = await utilityLibraryPage.DeductAmount(initialAvailableBal, finalAvailableBal);
                    await utilityLibraryPage.VerifyExpectedActual((availableBalDiff.toFixed(2)).toString(), data.remittanceAmount);
                });
                // -----------------------------------------------------------
                // 5️⃣ SEARCH TRANSACTION BY REF ID
                // -----------------------------------------------------------
                await allure.step('Verify details in transaction history screen by ref ID', async () => {
                    await transactionHistoryPage.OpenTransactionHistoryScreen(page, data.fromAccountNumber);
                    await transactionHistoryPage.ClickSearchTransactionHistory(page);
                    await transactionHistoryPage.SearchByReferenceID(page, actualRefID);
                    const actualPaymentDate = await utilityLibraryPage.CalculateDateMonthDDYYYY("TODAY");
                    await transactionHistoryPage.VerifyTransactionDetails(page, actualPaymentDate, "", data.fromAccountNumber, data.beneficiaryAccountIban, data.remittanceAmount, data.currency, data.remarks);
                });
                // -----------------------------------------------------------
                // 6️⃣ CLOSE SUCCESS & LOGOUT
                // -----------------------------------------------------------
                await test.step('Logout', async () => {
                    await loginPage.logout();
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

test.describe('SIA-21|SWIFT Transfer Negative Scenarios (CSV)', { tag: ['@SwiftTransfer', '@Negative', '@SIA-21'] }, () => {
    const positiveRows = rows.filter(r => String(r.Flow ?? '').toLowerCase().trim() === 'negative');
    for (const [index, row] of positiveRows.entries()) {
        const scenarioLabel = row.ScenarioName?.replace(/\s+/g, ' ').trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {
            const loginPage = new LoginPage(page);
            const swiftPage = new SwiftTransferPage(page);
            const utilityLibraryPage = new utilityLibrary(page);
            const errorVerification = new PopupErrorVerifier(page);
            const pay = new PayTransfer(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);
            const data: SwiftTransferFormData = {
                fromAccountNumber: row.FromAccountNumber,
                currency: row.Currency,
                remittanceAmount: row.RemittanceAmount,
                beneficiaryCountry: row.BeneficiaryCountry,
                beneficiaryAccountIban: row.BeneficiaryAccountIban,
                beneficiaryName: row.BeneficiaryName,
                beneficiaryAddress1: row.BeneficiaryAddress1,
                beneficiaryAddress2: row.BeneficiaryAddress2,
                beneficiaryBankBic: row.BeneficiaryBankBic,
                beneficiaryBankName: row.BeneficiaryBankName,
                beneficiaryBankAddress: row.BeneficiaryBankAddress,
                intermediaryBankBic: row.IntermediaryBankBic,
                intermediaryBankName: row.IntermediaryBankName,
                chargeOption: row.ChargeOption,
                remarks: row.Remarks,
            };
            const errorData: SwiftTransferErrorData = {
                errorMessageAmount: row.ErrorMessageAmount,
                errorMessageBeneficiaryCountry: row.ErrorMessageBeneficiaryCountry,
                errorMessageBeneficiaryAccNo: row.ErrorMessageBeneficiaryAccount,
                errorMessageBeneficiaryName: row.ErrorMessageBeneficiaryName,
                errorMessageBeneficiaryAddress1: row.ErrorMessageBeneficiaryAddrL1,
                errorMessageBeneficiaryAddress2: row.ErrorMessageBeneficiaryAddrL2,
                errorMessageBeneficiaryBankBic: row.ErrorMessageBeneficiaryBIC,
                errorMessageBeneficiaryBankName: row.ErrorMessageBeneficiaryBankName,
                errorMessageBeneficiaryBankAddress: row.ErrorMessageBeneficiaryBankAddr,
                errorMessageChargeOption: row.ErrorMessageChargeOption,
                errorMessageRemarks: row.ErrorMessageRemarks
            };

            try {
                // -----------------------------------------------------------
                // 1️⃣ LOGIN + CAPTURE INITIAL BALANCE
                // -----------------------------------------------------------
                await allure.step('Login and verify account', async () => {
                    await loginPage.goto();
                    await loginPage.login(row.Username, row.Password);

                });
                // -----------------------------------------------------------
                // 2️⃣ NAVIGATION 
                // -----------------------------------------------------------               
                await allure.step('Navigate to swift transfer section', async () => {
                    await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                    await utilityLibraryPage.SelectSubMenu(page, 'SWIFT Transfer');
                    await pay.navigation.clickPayBeneficiaryOnce();
                    await waitForSpinnerToDisappear(page);
                });
                // -----------------------------------------------------------
                // 3️⃣ FILL FORM
                // -----------------------------------------------------------
                await allure.step('Fill form and submit', async () => {
                    await swiftPage.fillForm(data);
                    await swiftPage.btnPay.click();
                });

                await allure.step('Verification of field validations', async () => {
                    if (errorData.errorMessageAmount.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errAmountField, errorData.errorMessageAmount);
                    }
                    if (errorData.errorMessageBeneficiaryCountry.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryCountryField, errorData.errorMessageBeneficiaryCountry);
                    }
                    if (errorData.errorMessageBeneficiaryAccNo.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryAccField, errorData.errorMessageBeneficiaryAccNo);
                    }
                    if (errorData.errorMessageBeneficiaryName.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryNameField, errorData.errorMessageBeneficiaryName);
                    }
                    if (errorData.errorMessageBeneficiaryAddress1.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryAddrL1Field, errorData.errorMessageBeneficiaryAddress1);
                    }
                    if (errorData.errorMessageBeneficiaryAddress2.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryAddrL2Field, errorData.errorMessageBeneficiaryAddress2);
                    }
                    if (errorData.errorMessageBeneficiaryBankBic.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryBICField, errorData.errorMessageBeneficiaryBankBic);
                    }
                    if (errorData.errorMessageBeneficiaryBankName.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryBankNameField, errorData.errorMessageBeneficiaryBankName);
                    }
                    if (errorData.errorMessageBeneficiaryBankAddress.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errBeneficiaryBankAddrField, errorData.errorMessageBeneficiaryBankAddress);
                    }
                    if (errorData.errorMessageChargeOption.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errChargeOptionField, errorData.errorMessageChargeOption);
                    }
                    if (errorData.errorMessageRemarks.trim().length > 0) {
                        await errorVerification.verifyErrorMessage(swiftPage.errRemarksField, errorData.errorMessageRemarks);
                    }
                });
            }
            catch (error) {
                console.error(`Scenario ${index + 1} FAILED: ${row.ScenarioName}`);
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

test.describe('UI Check for different accounts type', () => {
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
                    const fromAccountDropdown = page.locator(`xpath=//mat-label[contains(text(),'From Account')]/../following-sibling::mat-select`);
                    utilityLibraryPage.CheckAccountInDropdown(page, fromAccountDropdown, accountNum);
                });
            }
        });
    }
});

