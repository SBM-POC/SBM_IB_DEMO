import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '../pages/loginPage';
import { PayTransferMenu } from '../pages/PayTransferMenu';
import { OwnBankTransferPage } from '../pages/OwnAccountTransferPage';
import { MyAccount } from '../pages/MyAccountPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import { readCsvData } from '../Utils/readCsvData';
import { PayTransfer } from '../pages/PayTransferPage';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import * as allure from "allure-js-commons";




// Read all CSV rows into an array of { columnName: value }
function readCsvRows(filePath: string): Record<string, string>[] {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    const [header, ...lines] = raw.split(/\r?\n/);
    const cols = header.split(',').map(s => s.trim());
    return lines.filter(Boolean).map(line => {
        const cells = line.split(',').map(s => s.trim());
        const row: Record<string, string> = {};
        cols.forEach((c, i) => (row[c] = cells[i] ?? ''));
        return row;
    });
}

// Case-insensitive lookup of a value from a CSV row
const csv = (r: Record<string, string>, n: string) => {
    const k = Object.keys(r).find(x => x.trim().toLowerCase() === n.trim().toLowerCase());
    return k ? String(r[k] ?? '') : '';
};

// Decide which error messages to expect for a negative case (from CSV)
function parseExpectations(row: Record<string, string>): {
    type: 'inline' | 'popup' | '';
    messages: string[];
} {
    const typeRaw = (csv(row, 'expectedErrorsType') || '').trim().toLowerCase();
    const errsRaw = (csv(row, 'expectedErrors') || '').trim();
    let type: 'inline' | 'popup' | '' =
        typeRaw === 'inline' || typeRaw === 'popup' ? (typeRaw as any) : '';
    let messages = errsRaw ? errsRaw.split('|').map(s => s.trim()).filter(Boolean) : [];

    // If compact fields aren’t provided, fall back to legacy columns
    if (!type && messages.length === 0) {
        const legacyInline = [
            'expectedInlineToAccount', 'expectedInlineAmount', 'expectedInlineRemarks', 'expectedInlineFrequency',
            'toAccountError', 'amountError', 'remarksError', 'frequencyError',
            'inlineToAccount', 'inlineAmount', 'inlineRemarks', 'inlineFrequency',
        ]
            .map(h => csv(row, h))
            .filter(v => !!v && v.trim().length > 0)
            .map(v => v.trim());

        if (legacyInline.length > 0) {
            type = 'inline'; messages = [...new Set(legacyInline)];
        } else if (csv(row, 'expectedPopup')) {
            type = 'popup'; messages = [csv(row, 'expectedPopup').trim()];
        }
    }
    return { type, messages };
}

// Location of the spreadsheet file that powers these tests
const dataFilePath = path.resolve('Data', 'TestData_OwnBankTransfer.csv');

// ========================= POSITIVE FLOWS =========================
// Story: a user fills the form correctly and the transfer goes through.
test.describe('SIA-18|Own Bank Transfer — Positive Scenarios (CSV)', { tag: ['@E2E','@OwnAccountTransfer','@Positive','@SIA-18'] }, () => {
    if (!fs.existsSync(dataFilePath)) test.skip(true, `Data file not found: ${dataFilePath}`);

    // Keep only rows that are enabled and marked “positive”
    const rows = readCsvRows(dataFilePath).filter(r =>
        (csv(r, 'enabled') || '').toLowerCase().trim() !== 'false' &&
        (csv(r, 'flow') || '').toLowerCase().trim() === 'positive'
    );
    if (rows.length === 0) test.skip(true, 'No positive rows found');

    for (const [i, row] of rows.entries()) {
        const label = csv(row, 'ScenarioName') || `Scenario ${i + 1}`;
        test(label, async ({ page }) => {


            const login = new LoginPage(page);
            const menu = new PayTransferMenu(page);
            const transfer = new OwnBankTransferPage(page);
            const myAccount = new MyAccount(page);
            const utilityLibraryPage = new utilityLibrary(page);
            const pay = new PayTransfer(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);

            // Open the app and sign in
            await test.step('Open login page', async () => {
                await login.goto();
            });

            await test.step('Login', async () => {
                await login.login(csv(row, 'Username'), csv(row, 'Password'));
            });


            const initialAvailableBal = await allure.step('Verify account', async () => {
                await myAccount.assertMyAccountTabActive();
                const available = await utilityLibraryPage.CaptureBalance(page, (csv(row, 'fromAccount')), "accountType");
                return available;

            })


            // Go to the “Own Account Transfers” screen
            await test.step('Navigate: Own Account Transfers', async () => {
                await menu.openAndSelect('Own Account Transfers');
            });

            // Fill the form using values from the CSV row
            await test.step('Fill form', async () => {
                const testDataUsed = `        
                          - From Account:'${(csv(row, 'FromAccount'))}'
                          - Amount:'${(csv(row, 'Amount'))}'
                          - To Account:'${(csv(row, 'ToAccount'))}'
                          - Remarks:'${(csv(row, 'Remarks'))}';
                          - Currency: '${(csv(row, 'Currency'))}'`;
                await allure.attachment("Test Data", testDataUsed, "text/plain");
                await transfer.selectFromAccount(csv(row, 'FromAccount'));
                await transfer.selectToAccount(csv(row, 'ToAccount'));
                await transfer.selectCurrency(csv(row, 'Currency'));
                await transfer.enterAmount(csv(row, 'Amount'));
                await transfer.enterRemarks(csv(row, 'Remarks'));
            });


            // If the row says it’s a recurring payment, turn that on and pick a frequency
            const freq = csv(row, 'frequency');
            const recurringFlag = csv(row, 'recurring').toLowerCase();
            const scenarioHasRecurring = (csv(row, 'ScenarioName') || '').toLowerCase().includes('recurring');
            if (freq || scenarioHasRecurring || ['yes', 'true', '1'].includes(recurringFlag)) {
                await test.step('Enable Recurring', async () => {
                    await transfer.enableRecurring();
                });
                if (freq) {
                    await test.step(`Select Frequency: ${freq}`, async () => {
                        await transfer.selectFrequency(freq);
                    });
                }
            }

            // Continue to the confirmation screen
            await test.step('Click Transfer', async () => {
                await transfer.clickTransfer();
            });

            // Check that the confirmation screen reflects what we entered
            await test.step('Verification of Confirmation page', async () => {
                await transfer.expectConfirmFromAccountContains(csv(row, 'fromAccount'));
                await transfer.expectConfirmToAccountContains(csv(row, 'toAccount'));
                await transfer.expectConfirmAmountNumeric(csv(row, 'amount'));
                await transfer.expectConfirmRemarksEquals(csv(row, 'remarks'));
            });






            await test.step('Click Confirm', async () => {
                await transfer.clickConfirm();
            });

            // On the success screen, check key details again
            await test.step('Verfication of Transfer Successful page', async () => {
                await transfer.expectSuccessAmountNumeric(csv(row, 'amount'));
                await transfer.expectSuccessCurrencyEquals(csv(row, 'currency'));
                await transfer.expectSuccessToAccountContains(csv(row, 'toAccount'));
                await transfer.expectSuccessRemarksEquals(csv(row, 'remarks'));

            });


            await allure.step('Download receipt and verify receipt content', async () => {
                const maskedFromAccount = await utilityLibraryPage.MaskedAccountNumber((csv(row, 'fromAccount')));
                const maskedToAccount = await utilityLibraryPage.MaskedAccountNumber(csv(row, 'toAccount'));
                const actualPaymentDate = await utilityLibraryPage.CalculateDateMonthDDYYYY(csv(row, 'paymentDate'));
                await transfer.verifyReceiptData(maskedFromAccount, maskedToAccount, actualPaymentDate, (csv(row, 'amount')), (csv(row, 'currency')), (csv(row, 'remarks')), (csv(row, 'actualRefID')),"");
                await pay.dialog.close();

            });


            await allure.step('Verify amount deduction from debit via search by ref ID', async () => {
                await utilityLibraryPage.SelectTab(page, 'My Accounts');
                const  finalAvailableBal = await utilityLibraryPage.CaptureBalance(page, (csv(row, 'fromAccount')), "CURRENT AND SAVING");
                const availableBalDiff = await finalAvailableBal - initialAvailableBal;
                await utilityLibraryPage.VerifyExpectedActual(availableBalDiff.toString(), (csv(row, 'amount')));
            });


            // Sign out to finish the scenario cleanly
            await test.step('Logout', async () => {
                await login.logout();
            });
        });
    }
});

// ========================= NEGATIVE FLOWS =========================
test.describe('SQP-18|Own Bank Transfer — Negative Scenarios (CSV)',{ tag: ['@OwnAccountTransfer','@Negative','@SIA-18'] }, () => {

    if (!fs.existsSync(dataFilePath)) test.skip(true, `Data file not found: ${dataFilePath}`);

    const rows = readCsvRows(dataFilePath).filter(r =>
        csv(r, 'flow').toLowerCase() === 'negative' &&
        csv(r, 'enabled').toLowerCase() !== 'false'
    );

    if (rows.length === 0) test.skip(true, 'No negative rows found');

    for (const [i, row] of rows.entries()) {

        const label = csv(row, 'ScenarioName') || `Negative ${i + 1}`;

        test(label, async ({ page }) => {

            const login = new LoginPage(page);
            const menu = new PayTransferMenu(page);
            const transfer = new OwnBankTransferPage(page);

            await test.step('Open login page', async () => { await login.goto(); });
            await test.step('Login', async () => { await login.login(csv(row, 'Username'), csv(row, 'Password')); });
            await test.step('Navigate: Own Account Transfers', async () => { await menu.openAndSelect('Own Account Transfers'); });

            if (csv(row, 'fromAccount'))
                await test.step(`Fill From Account: ${csv(row, 'fromAccount')}`, async () => { await transfer.selectFromAccount(csv(row, 'fromAccount')); });

            if (csv(row, 'toAccount'))
                await test.step(`Fill To Account: ${csv(row, 'toAccount')}`, async () => { await transfer.selectToAccount(csv(row, 'toAccount')); });

            if (csv(row, 'currency'))
                await test.step(`Fill Currency: ${csv(row, 'currency')}`, async () => { await transfer.selectCurrency(csv(row, 'currency')); });

            if (csv(row, 'amount'))
                await test.step(`Fill Amount: ${csv(row, 'amount')}`, async () => { await transfer.enterAmount(csv(row, 'amount')); });

            if (csv(row, 'remarks'))
                await test.step(`Fill Remarks: ${csv(row, 'remarks')}`, async () => { await transfer.enterRemarks(csv(row, 'remarks')); });

            if (csv(row, 'Frequency')) {
                await test.step('Enable Recurring', async () => { await transfer.enableRecurring(); });
                await test.step(`Select Frequency: ${csv(row, 'Frequency')}`, async () => { await transfer.selectFrequency(csv(row, 'Frequency')); });
            }

            await test.step('Click Transfer (Negative Expectation)', async () => {
                await transfer.clickTransferNoConfirmWait();
            });

            const errorType = csv(row, 'expectedErrorsType').toLowerCase();
            const rawErrors = csv(row, 'expectedErrors');
            const messages = rawErrors ? rawErrors.split('|').map(x => x.trim()) : [];

            if (errorType === 'inline' && messages.length > 0) {

                const joined = messages.join(' | ');

                await test.step(`Verify Inline Errors: ${joined}`, async () => {
                    allure.step(`Validating all inline errors: ${joined}`, () => { });

                    for (const msg of messages) {
                        const lower = msg.toLowerCase();

                        if (lower.includes('beneficiary')) await transfer.expectToAccountError(msg);
                        else if (lower.includes('amount')) await transfer.expectAmountError(msg);
                        else if (lower.includes('remarks')) await transfer.expectRemarksError(msg);
                        else if (lower.includes('frequency')) await transfer.expectFrequencyError(msg);
                        else await transfer.expectInlineError(msg);
                    }
                });
                await test.step('Logout', async () => { await login.logout(); });
                return;
            }

            if (errorType === 'popup' && messages.length === 1) {
                await test.step('Click Confirm (Expect Popup)', async () => {
                    await transfer.clickConfirm();
                });

                await test.step(`Assert Popup Error: "${messages[0]}"`, async () => {
                    allure.step(`Validating popup error: ${messages[0]}`, () => { });
                    await transfer.expectPopupError(messages[0]);
                });

                await test.step('Logout', async () => { await login.logout(); });
                return;
            }

            await test.step('Logout (No assertions found)', async () => { await login.logout(); });
        });
    }
});





// ========================= UI CHECK =========================
test.describe('SiA-72|UI Check for Own Bank Transfer (Based on account types)', { tag: ['@UI','@SIA-72'] },() => {
    const scenarios = readCsvData('TestData_Transfer_UI.csv');

    for (const [index, row] of scenarios.entries()) {

        const scenarioLabel = row.Description?.trim();

        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }) => {

            const username = row.Username.trim();
            const password = row.Password.trim();
            const accountType = row.AccountType.trim();
            const accountNum = row.Account.trim();
            const displayOnScreen = row.DisplayOnScreen.trim();
            const allowDebit = row.AllowDebit.trim();


            const loginPage = new LoginPage(page);
            const myAccount = new MyAccount(page);
            const util = new utilityLibrary(page);
            const ownBankTransferPage = new OwnBankTransferPage(page);
            const menu = new PayTransferMenu(page);

            // --- LOGIN ---
            await allure.step('Login', async () => {
                await loginPage.goto();
                await loginPage.login(username, password);
                await myAccount.assertMyAccountTabActive();
            });

            // --- DASHBOARD VERIFICATION ---
            if (displayOnScreen.toLowerCase() === 'yes') {

                await allure.step('Verify account is visible on Dashboard', async () => {
                    await util.isPresentOnDashboard(page, accountType, accountNum, "Dashboard");
                });

                // --- NAVIGATION ---
                await allure.step('Navigate to Own Account Transfer', async () => {
                    await util.SelectTab(page, 'Pay & Transfer');
                    await util.SelectSubMenu(page, 'Own Account Transfers');
                    await waitForSpinnerToDisappear(page);
                });

                // --- ACCOUNT VALIDATION IN DROPDOWN ---
                if (allowDebit.toLowerCase() === 'yes') {
                    await allure.step('Verify account is present in From Account dropdown', async () => {
                        const fromAccountDropdownfld = await page.locator(ownBankTransferPage.fromAccountDropdown);
                        await util.CheckAccountInDropdown(page, fromAccountDropdownfld, accountNum);
                    });
                }

                if (allowDebit.toLowerCase() === 'no') {
                    await allure.step('Verify account is NOT present in From Account dropdown', async () => {
                        const fromAccountDropdownfld = await page.locator(ownBankTransferPage.fromAccountDropdown);
                        await util.CheckAccountNotInDropdown(page, fromAccountDropdownfld, accountNum);
                    });
                }
            }

            // ACCOUNT SHOULD NOT DISPLAY ANYWHERE
            if (displayOnScreen.toLowerCase() === 'no') {

                await allure.step('Verify account is NOT visible on Dashboard', async () => {
                    await util.isNotPresentOnDashboard(page, accountType, accountNum, "Dashboard");
                });

            }

        });
    }
});