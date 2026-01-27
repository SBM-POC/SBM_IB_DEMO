import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { SwiftTransferPage, SwiftTransferFormData } from '../pages/swiftTransferPage';
import { captureScreenshot } from '../Utils/ScreenshotHelper';
import { readCsvData } from '../Utils/readCsvData';
import * as allure from "allure-js-commons";
import { utilityLibrary } from '../Utils/utilityLibrary';
import { MyAccount } from '../pages/MyAccountPage';
import { PayTransfer } from '../pages/PayTransferPage';


const rows: any[] = readCsvData('swiftTransfer.csv');


// ============================================================================
//  POSITIVE SCENARIOS
// ============================================================================
test.describe('SWIFT Transfer Positive Scenarios (CSV)', () => {

    test.use({ actionTimeout: 30000, navigationTimeout: 45000 });

    const positiveRows = rows.filter(r =>
        String(r.enabled ?? '').toLowerCase().trim() !== 'false' &&
        String(r.flow ?? '').toLowerCase().trim() === 'positive'
    );

    for (const [i, row] of positiveRows.entries()) {

        const label = row.rowId ? `Row ${row.rowId}` : `Scenario ${i + 1}`;

        const formData: SwiftTransferFormData = {
            scenarioName: row.scenarioName,
            fromAccountNumber: row.fromAccountNumber,
            currency: row.currency,
            remittanceAmount: row.remittanceAmount,
            beneficiaryCountry: row.beneficiaryCountry,
            beneficiaryAccountIban: row.beneficiaryAccountIban,
            beneficiaryName: row.beneficiaryName,
            beneficiaryAddress1: row.beneficiaryAddress1,
            beneficiaryAddress2: row.beneficiaryAddress2 || undefined,
            beneficiaryBankBic: row.beneficiaryBankBic,
            intermediaryBankBic: row.intermediaryBankBic || undefined,
            chargeOption: row.chargeOption || undefined,
            remarks: row.remarks,
        };

        test(`${label}: ${formData.scenarioName}`, async ({ page }, info) => {

            const login = new LoginPage(page);
            const swift = new SwiftTransferPage(page);
            const utilityLib = new utilityLibrary(page);
            const myAccount = new MyAccount(page);

            let initialLedgerBal: number;
            let initialAvailableBal: number;

            // -----------------------------------------------------------
            // 1️⃣ LOGIN + CAPTURE INITIAL BALANCE
            // -----------------------------------------------------------
            await test.step('Login and capture initial balance', async () => {

                const testDataUsed =
                    `Username: ${row.Username}\nAccount: ${row.fromAccountNumber}`;
                await allure.attachment("Test Data Used", testDataUsed, "text/plain");

                await login.goto();
                await login.login(row.Username, row.Password);

                await myAccount.assertMyAccountTabActive();

                const [ledger, available] =
                    await utilityLib.CaptureBalance(page, row.fromAccountNumber, "CURRENT AND SAVING");

                initialLedgerBal = ledger;
                initialAvailableBal = available;

                await captureScreenshot('Initial Balance Captured', page, info);
            });


            // -----------------------------------------------------------
            // 2️⃣ OPEN FORM
            // -----------------------------------------------------------
            await test.step('Open form', async () => {
                await swift.openForm();
                await swift.assertCutoffToast();
                await captureScreenshot('Form open', page, info);
            });


            // -----------------------------------------------------------
            // 3️⃣ FILL FORM
            // -----------------------------------------------------------
            await test.step('Fill form', async () => {
                await swift.fillForm(formData);
                await captureScreenshot('Form filled', page, info);
            });


            // -----------------------------------------------------------
            // 4️⃣ SUBMIT + ASSERT CONFIRMATION DIALOG
            // -----------------------------------------------------------
            await test.step('Submit (assert confirmation dialog)', async () => {
                await swift.openConfirmDialog();
                await swift.assertConfirmation(formData);
                await captureScreenshot('Confirmation dialog', page, info);

                await swift.confirmFromDialog();
                await captureScreenshot('Submitted', page, info);
            });



            let actualRefID: string | undefined;

            await allure.step('Validate successful dialog details', async () => {
                actualRefID = await swift.verifySwiftSuccessDialog(formData);

            });


            // -----------------------------------------------------------
            // 5️⃣ VERIFY BALANCE DEDUCTION
            // -----------------------------------------------------------
            /*
            await test.step('Verify balance deduction', async () => {

                await utilityLib.SelectTab(page, 'My Accounts');

                const [finalLedgerBal, finalAvailableBal] =
                    await utilityLib.CaptureBalance(
                        page,
                        row.fromAccountNumber,
                        "CURRENT AND SAVING"
                    );

                const ledgerBalDiff = await utilityLib.DeductAmount(initialLedgerBal, finalLedgerBal);
                const availableBalDiff = await utilityLib.DeductAmount(initialAvailableBal, finalAvailableBal);

                await utilityLib.VerifyExpectedActual(
                    ledgerBalDiff.toFixed(2).toString(),
                    formData.remittanceAmount
                );

                await utilityLib.VerifyExpectedActual(
                    availableBalDiff.toFixed(2).toString(),
                    formData.remittanceAmount
                );

                await captureScreenshot('Balance Verification Done', page, info);
            });
            */


            // -----------------------------------------------------------
            // 6️⃣ CLOSE SUCCESS & LOGOUT
            // -----------------------------------------------------------
            await test.step('Close & logout', async () => {
                await swift.closeSuccessDialog();
                await login.logout();
            });

        });
    }
});



test.describe('SWIFT Transfer Negative Scenarios (CSV)', () => {
    test.use({ actionTimeout: 30000, navigationTimeout: 45000 });

    const negativeRows = rows.filter(r =>
        String(r.enabled ?? '').toLowerCase().trim() !== 'false' &&
        String(r.flow ?? '').toLowerCase().trim() === 'negative'
    );

    for (const [i, row] of negativeRows.entries()) {
        const label = row.rowId ? `Neg Row ${row.rowId}` : `Negative ${i + 1}`;

        test(`${label}: ${row.scenarioName}`, async ({ page }, info) => {
            const login = new LoginPage(page);
            const swift = new SwiftTransferPage(page);

            const formData: SwiftTransferFormData = {
                scenarioName: row.scenarioName,
                fromAccountNumber: row.fromAccountNumber,
                currency: row.currency,
                remittanceAmount: row.remittanceAmount,
                beneficiaryCountry: row.beneficiaryCountry,
                beneficiaryAccountIban: row.beneficiaryAccountIban,
                beneficiaryName: row.beneficiaryName,
                beneficiaryAddress1: row.beneficiaryAddress1,
                beneficiaryAddress2: row.beneficiaryAddress2 || undefined,
                beneficiaryBankBic: row.beneficiaryBankBic,
                intermediaryBankBic: row.intermediaryBankBic || undefined,
                chargeOption: row.chargeOption || undefined,
                remarks: row.remarks,
            };

            const scenario = String(row.scenarioName ?? '').toLowerCase();
            const expectedErrorText = String(row.expectedErrorText ?? '').trim();
            const specialChars = String(row.specialChars ?? '').trim();

            await test.step('Login & open form', async () => {
                await login.goto();
                await login.login(row.Username, row.Password);
                await swift.openForm();
                await captureScreenshot('Neg - open', page, info);
            });

            await test.step('Fill common fields', async () => {
                await swift.fillForm(formData);
                await captureScreenshot('Neg - base filled', page, info);
            });

            // 1) Special character in remarks
            if (scenario.includes('special') && scenario.includes('remarks')) {
                await test.step('Remarks rejects specials', async () => {
                    if (specialChars) {
                        await swift.remarksField.fill('');
                        await swift.remarksField.type(specialChars);
                        await swift.remarksField.blur();
                        await swift.assertNoSpecialCharsRemain(swift.remarksField, specialChars);
                    }
                    if (expectedErrorText) {
                        const anyError = page.locator('mat-error');
                        await expect(anyError).toContainText(new RegExp(expectedErrorText, 'i'));
                    }
                });
                return;
            }

            // 2) EUR transfer exceed daily limit (toast after Pay → Confirm)
            if (scenario.includes('daily') || scenario.includes('exceed')) {
                await test.step('Pay → Confirm, expect toast', async () => {
                    await swift.submitAndConfirm(formData);
                    await swift.assertToastContains(new RegExp(expectedErrorText || 'Daily limit', 'i'));
                    await captureScreenshot('Neg - daily limit', page, info);
                });
                return;
            }

            // 3) Amount more than available balance (inline error)
            if (scenario.includes('greater') || scenario.includes('available balance') || scenario.includes('account balance')) {
                await test.step('Amount inline error', async () => {
                    await swift.amountField.blur(); // trigger validation
                    await swift.assertInlineAmountErrorContains(new RegExp(expectedErrorText || 'greater than available balance', 'i'));
                    await captureScreenshot('Neg - amount > balance', page, info);
                });
                return;
            }

            // 4) Special character in amount
            if (scenario.includes('special') && scenario.includes('amount')) {
                await test.step('Amount rejects specials', async () => {
                    if (specialChars) {
                        await swift.amountField.fill('');
                        await swift.amountField.type(specialChars);
                        await swift.amountField.blur();
                        await swift.assertNoSpecialCharsRemain(swift.amountField, specialChars);
                    }
                    if (expectedErrorText) {
                        const maybeError = swift.amountField.locator('xpath=ancestor::mat-form-field//mat-error').first();
                        // if UI shows an inline error for specials, assert it; otherwise just ensure no specials remained
                        await maybeError.isVisible().then(async vis => {
                            if (vis) await expect(maybeError).toContainText(new RegExp(expectedErrorText, 'i'));
                        }).catch(() => { });
                    }
                    await captureScreenshot('Neg - amount specials', page, info);
                });
                return;
            }

            // Default: mark as inconclusive with a soft assertion to catch unmapped scenario names
            await test.step('Unmapped negative scenario', async () => {
                test.info().annotations.push({ type: 'note', description: `Scenario not mapped: ${row.scenarioName}` });
                expect.soft(false, `Unknown negative scenario pattern: ${row.scenarioName}`).toBeTruthy();
            });
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

