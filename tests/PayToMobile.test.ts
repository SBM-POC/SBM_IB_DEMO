import { test } from '@playwright/test';
import path from 'path';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { PayTransferMenu } from '../pages/PayTransferMenu';
import { PayToMobilePage } from '../pages/PayToMobilePage';
import * as allure from "allure-js-commons";
import { MyAccount } from '../pages/MyAccountPage';
import { utilityLibrary } from '../Utils/utilityLibrary';


let actualRefID: string;
const ledgerBal = "";
const availableBal = "";




// Resolve CSV path without altering existing behavior
const csvDataFilePath = path.resolve('Data', 'TestData_PayToMobile.csv');

// Read a CSV cell using a case/space-insensitive header match
const getCsvValue = (row: Record<string, string>, columnName: string): string => {
    const matchedKey = Object.keys(row).find(
        key => key.trim().toLowerCase() === columnName.trim().toLowerCase()
    );
    return matchedKey ? String(row[matchedKey]).trim() : '';
};

// ==================== POSITIVE FLOW ====================

test.describe('Pay to Mobile — Positive Flow', { tag: ['@E2E','@PayToMobile','@SIA-33'] }, () => {
    // Load only enabled positive scenarios from CSV
    const testRows = readCsvData('TestData_PayToMobile.csv').filter(
        r => (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false' &&
            (getCsvValue(r, 'flow') || '').toLowerCase() === 'positive'
    );
    if (testRows.length === 0) test.skip(true, 'No positive rows found in CSV');
    // ==================== POSITIVE FLOW ====================
    test.describe('Pay to Mobile — Positive Flow', () => {
        // Load only enabled positive scenarios from CSV
        const testRows = readCsvData('TestData_PayToMobile.csv').filter(
            r => (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false' &&
                (getCsvValue(r, 'flow') || '').toLowerCase() === 'positive'
        );
        if (testRows.length === 0) test.skip(true, 'No positive rows found in CSV');

        testRows.forEach((testRow, index) => {
            const scenarioName = getCsvValue(testRow, 'ScenarioName') || `Scenario ${index + 1}`;
            const recipientMobile = getCsvValue(testRow, 'RecipientMobile') || `Row${index + 1}`;
            const testTitle = `${scenarioName} - [${recipientMobile}]`;
            testRows.forEach((testRow, index) => {
                const scenarioName = getCsvValue(testRow, 'ScenarioName') || `Scenario ${index + 1}`;
                const recipientMobile = getCsvValue(testRow, 'RecipientMobile') || `Row${index + 1}`;
                const testTitle = `${scenarioName} - [${recipientMobile}]`;

                test(testTitle, async ({ page }) => {

                    const loginPage = new LoginPage(page);
                    const payTransferMenu = new PayTransferMenu(page);
                    const payToMobile = new PayToMobilePage(page);
                    const myAccount = new MyAccount(page);
                    const utilityLibraryPage = new utilityLibrary(page);

                    // Step 1: Login
                    await test.step('Open login page', async () => {
                        await loginPage.goto();
                    });

                    await test.step('Login with credentials', async () => {
                        await loginPage.login(
                            getCsvValue(testRow, 'Username'),
                            getCsvValue(testRow, 'Password')
                        );
                    });

                    // LOGIN AGAIN + CAPTURE INITIAL BALANCE
                    const [initialLedgerBal, initialAvailableBal] =
                        await allure.step('Login and verify account', async () => {

                            await loginPage.goto();
                            await loginPage.login(
                                getCsvValue(testRow, 'Username'),
                                getCsvValue(testRow, 'Password')
                            );

                            await myAccount.assertMyAccountTabActive();

                            const [ledger, available] =
                                await utilityLibraryPage.CaptureBalance(
                                    page,
                                    getCsvValue(testRow, 'FromAccount'),
                                    "accountType"
                                );

                            return [ledger, available];
                        });

                    // Step 2: Navigate
                    await test.step('Open Pay & Transfer → Pay to Mobile', async () => {
                        await payTransferMenu.openAndSelect('Pay to Mobile');
                    });
                    test(testTitle, async ({ page }) => {

                        const loginPage = new LoginPage(page);
                        const payTransferMenu = new PayTransferMenu(page);
                        const payToMobile = new PayToMobilePage(page);
                        const myAccount = new MyAccount(page);
                        const utilityLibraryPage = new utilityLibrary(page);

                        // Step 1: Login
                        await test.step('Open login page', async () => {
                            await loginPage.goto();
                        });

                        await test.step('Login with credentials', async () => {
                            await loginPage.login(
                                getCsvValue(testRow, 'Username'),
                                getCsvValue(testRow, 'Password')
                            );
                        });

                        // LOGIN AGAIN + CAPTURE INITIAL BALANCE
                        const [initialLedgerBal, initialAvailableBal] =
                            await allure.step('Login and verify account', async () => {

                                await loginPage.goto();
                                await loginPage.login(
                                    getCsvValue(testRow, 'Username'),
                                    getCsvValue(testRow, 'Password')
                                );

                                await myAccount.assertMyAccountTabActive();

                                const [ledger, available] =
                                    await utilityLibraryPage.CaptureBalance(
                                        page,
                                        getCsvValue(testRow, 'FromAccount'),
                                        "accountType"
                                    );

                                return [ledger, available];
                            });

                        // Step 2: Navigate
                        await test.step('Open Pay & Transfer → Pay to Mobile', async () => {
                            await payTransferMenu.openAndSelect('Pay to Mobile');
                        });

                        // Step 3: Enter Mobile
                        await test.step('Enter Recipient Mobile', async () => {
                            await payToMobile.enterRecipientMobile(recipientMobile);
                        });
                        // Step 3: Enter Mobile
                        await test.step('Enter Recipient Mobile', async () => {
                            await payToMobile.enterRecipientMobile(recipientMobile);
                        });

                        await test.step('Verify Recipient Mobile is prefixed with +230', async () => {
                            await payToMobile.assertRecipientMobileHasMauritiusCode();
                        });

                        await test.step('Click Search User', async () => {
                            await payToMobile.clickSearchUser();
                        });


                        // Step 4: Fill form
                        await test.step('Fill transfer details', async () => {

                            const fromAccount = getCsvValue(testRow, 'FromAccount');
                            const currency = getCsvValue(testRow, 'Currency');

                            await allure.attachment(
                                "Transfer Details Test Data",
                                `FromAccount: ${fromAccount}\nCurrency: ${currency}\n`,
                                "text/plain"
                            );

                            await payToMobile.selectFromAccount(fromAccount);
                            await payToMobile.selectCurrency(currency);
                        });

                        await test.step('Verify "Transfer Amount" field is available', async () => {
                            await payToMobile.assertAmountFieldAvailable();
                        });
                        // Step 4: Fill form
                        await test.step('Fill transfer details', async () => {

                            const fromAccount = getCsvValue(testRow, 'FromAccount');
                            const currency = getCsvValue(testRow, 'Currency');

                            await allure.attachment(
                                "Transfer Details Test Data",
                                `FromAccount: ${fromAccount}\nCurrency: ${currency}\n`,
                                "text/plain"
                            );

                            await payToMobile.selectFromAccount(fromAccount);
                            await payToMobile.selectCurrency(currency);
                        });

                        await test.step('Verify "Transfer Amount" field is available', async () => {
                            await payToMobile.assertAmountFieldAvailable();
                        });

                        await test.step('Enter amount and remarks', async () => {

                            const amount = getCsvValue(testRow, 'Amount');
                            const remarks = getCsvValue(testRow, 'Remarks');

                            await allure.attachment(
                                "Amount & Remarks Test Data",
                                `Amount: ${amount}\nRemarks: ${remarks}\n`,
                                "text/plain"
                            );

                            await payToMobile.enterAmount(amount);
                            await payToMobile.enterRemarks(remarks);
                        });

                        // Step 5: Proceed
                        await test.step('Click Next to go to confirmation page', async () => {
                            await payToMobile.clickNext();
                        });

                        await test.step('Verify confirmation screen (Transfer visible)', async () => {
                            await payToMobile.waitForConfirmationPage();
                        });

                        // Step 6: Confirm
                        await test.step('Click Confirm', async () => {
                            await payToMobile.clickConfirm();
                        });

                        await test.step('Verify Successful Page', async () => {
                            await payToMobile.verifySuccessfulPageLoaded();
                        });

                        // ⭐ FINAL BALANCE VERIFICATION
                        await allure.step(
                            'Verify amount deduction from debit via search by ref ID',
                            async () => {

                                const [finalLedgerBal, finalAvailableBal] =
                                    await utilityLibraryPage.CaptureBalance(
                                        page,
                                        getCsvValue(testRow, 'FromAccount'),
                                        "CURRENT AND SAVING"
                                    );

                                const ledgerBalDiff = finalLedgerBal - initialLedgerBal;
                                const availableBalDiff = finalAvailableBal - initialAvailableBal;

                                await utilityLibraryPage.VerifyExpectedActual(
                                    ledgerBalDiff.toString(),
                                    getCsvValue(testRow, 'Amount')
                                );

                                await utilityLibraryPage.VerifyExpectedActual(
                                    availableBalDiff.toString(),
                                    getCsvValue(testRow, 'Amount')
                                );
                            }
                        );

                        await test.step('Verify confirmation screen (Transfer visible)', async () => {
                            await payToMobile.waitForConfirmationPage();
                        });

                        // Step 6: Confirm
                        await test.step('Click Confirm', async () => {
                            await payToMobile.clickConfirm();
                        });

                        await test.step('Verify Successful Page', async () => {
                            await payToMobile.verifySuccessfulPageLoaded();
                        });

                        // ⭐ FINAL BALANCE VERIFICATION
                        await allure.step(
                            'Verify amount deduction from debit via search by ref ID',
                            async () => {

                                const [finalLedgerBal, finalAvailableBal] =
                                    await utilityLibraryPage.CaptureBalance(
                                        page,
                                        getCsvValue(testRow, 'FromAccount'),
                                        "CURRENT AND SAVING"
                                    );

                                const ledgerBalDiff = finalLedgerBal - initialLedgerBal;
                                const availableBalDiff = finalAvailableBal - initialAvailableBal;

                                await utilityLibraryPage.VerifyExpectedActual(
                                    ledgerBalDiff.toString(),
                                    getCsvValue(testRow, 'Amount')
                                );

                                await utilityLibraryPage.VerifyExpectedActual(
                                    availableBalDiff.toString(),
                                    getCsvValue(testRow, 'Amount')
                                );
                            }
                        );

                    });
                });
            });


            // ====================== NEGATIVE FLOW 
            test.describe('Pay to Mobile — Negative Flow', () => {

                const testRows = readCsvData('TestData_PayToMobile.csv').filter(r =>
                    (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false' &&
                    (getCsvValue(r, 'flow') || '').toLowerCase() === 'negative'
                );

                if (testRows.length === 0) {
                    test.skip(true, 'No negative rows found in CSV');
                }

                testRows.forEach((row, index) => {

                    const scenarioName = getCsvValue(row, 'ScenarioName') || `Negative Scenario ${index + 1}`;
                    const recipientMobile = getCsvValue(row, 'RecipientMobile');
                    const username = getCsvValue(row, 'Username');
                    const password = getCsvValue(row, 'Password');
                    const fromAccount = getCsvValue(row, 'FromAccount');
                    const amount = getCsvValue(row, 'Amount');
                    const remarks = getCsvValue(row, 'Remarks');
                    const errorFrequency = (getCsvValue(row, 'Error_Frequency') || '').trim().toLowerCase();
                    const expectedError = (getCsvValue(row, 'Error_Message') || '').trim();

                    const testTitle = `${scenarioName} - [${recipientMobile}]`;

                    test(testTitle, async ({ page }) => {

                        const loginPage = new LoginPage(page);
                        const menu = new PayTransferMenu(page);
                        const payToMobile = new PayToMobilePage(page);

                        // Attach expected error only
                        await allure.attachment(
                            "Expected Error Message",
                            `Error Frequency: ${errorFrequency}\nMessage: ${expectedError}`,
                            "text/plain"
                        );

                        // Login
                        await test.step('Open login page', async () => {
                            await loginPage.goto();
                        });

                        await test.step('Login with credentials', async () => {
                            await loginPage.login(username, password);
                        });

                        // Navigate
                        await test.step('Navigate → Pay & Transfer → Pay to Mobile', async () => {
                            await menu.openAndSelect('Pay to Mobile');
                        });

                        // Mobile
                        await test.step('Enter Recipient Mobile', async () => {
                            await payToMobile.enterRecipientMobile(recipientMobile);
                        });

                        await test.step('Click Search User', async () => {
                            await payToMobile.clickSearchUser();
                        });

                        let earlyExit = false;

                        // Banner error
                        await test.step('Check banner error', async () => {
                            if (await payToMobile.isMobileNotEligibleBannerVisible()) {

                                await allure.attachment("Detected Error Source", "BANNER detected", "text/plain");
                                await payToMobile.assertMobileNotEligibleBanner();

                                await loginPage.logout();
                                earlyExit = true;
                            }
                        });
                        if (earlyExit) return;

                        // Inline mobile validation
                        await test.step('Check inline mobile error', async () => {
                            if (await payToMobile.isInlineMobileErrorVisible()) {

                                await allure.attachment("Detected Error Source", "INLINE mobile error detected", "text/plain");
                                await payToMobile.assertInvalidMobileCountryCode();

                                await loginPage.logout();
                                earlyExit = true;
                            }
                        });
                        if (earlyExit) return;

                        // Fill remaining details
                        await test.step('Fill details (if applicable)', async () => {

                            if (fromAccount) {
                                await payToMobile.selectFromAccount(fromAccount);
                            }

                            if (amount) {
                                await payToMobile.enterAmount(amount);
                            }

                            if (typeof remarks === 'string') {
                                await payToMobile.enterRemarks(remarks);
                            }
                        });

                        // Trigger validation
                        await test.step('Click Next (Trigger Validation)', async () => {
                            await payToMobile.clickNext();
                        });

                        // Assert expected error
                        await test.step('Assert Expected Error Message', async () => {

                            await allure.attachment(
                                "Assertion Input",
                                `Frequency: ${errorFrequency}\nExpected: ${expectedError}`,
                                "text/plain"
                            );

                            await payToMobile.assertErrorDynamic(errorFrequency, expectedError);
                        });

                        // Logout
                        await test.step('Logout', async () => {
                            await loginPage.logout();
                        });

                    });
                });
            });
        });
    });
});
