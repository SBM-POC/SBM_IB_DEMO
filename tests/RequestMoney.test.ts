import { test } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { PayTransferMenu } from '../pages/PayTransferMenu';
import { RequestMoneyPage } from '../pages/RequestMoneyPage';
import * as allure from "allure-js-commons";

const getCsvValue = (row: Record<string, string>, columnName: string): string => {
    const matchedKey = Object.keys(row).find(
        key => key.trim().toLowerCase() === columnName.trim().toLowerCase()
    );
    return matchedKey ? String(row[matchedKey]).trim() : '';
};

test.describe('Request Money — Positive Flow', () => {
    const testRows = readCsvData('TestData_RequestMoney.csv').filter(
        r => (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false'
            && (getCsvValue(r, 'flow') || '').toLowerCase() === 'positive'
    );
    if (testRows.length === 0) test.skip(true, 'No positive rows found in CSV');

    testRows.forEach((row, index) => {
        const scenarioName =
            getCsvValue(row, 'scenarioName') ||
            getCsvValue(row, 'ScenarioName') ||
            `Scenario ${index + 1}`;

        const username = getCsvValue(row, 'username');
        const password = getCsvValue(row, 'password');
        const recipientMobile = getCsvValue(row, 'RecipientMobile');
        const requestToAccount = getCsvValue(row, 'RequestToAccount');
        const amount = getCsvValue(row, 'TransferAmount');
        const remarks = getCsvValue(row, 'Remarks');

        test(scenarioName, async ({ page }) => {
            const loginPage = new LoginPage(page);
            const payTransferMenu = new PayTransferMenu(page);
            const requestMoneyPage = new RequestMoneyPage(page);

            await test.step('Open login page', async () => {
                await loginPage.goto();
            });

            await test.step('Login with credentials', async () => {
                await loginPage.login(username, password);
            });

            await test.step('Navigate to Pay & Transfer → Request Money', async () => {
                await payTransferMenu.openAndSelect('Request Money');
            });

            //   await test('Wait until Request Money page is ready', async () => {
            //     await requestMoneyPage.waitUntilReady();
            // });

            await test.step('Fill Request Money form', async () => {

                // Attach the data to Allure report
                await allure.attachment(
                    "Request Money Test Data",
                    `RecipientMobile: ${recipientMobile}\n` +
                    `RequestToAccount: ${requestToAccount}\n` +
                    `Amount: ${amount}\n` +
                    `Remarks: ${remarks}`,
                    "text/plain"
                );

                await requestMoneyPage.fillForm({
                    RecipientMobile: recipientMobile,
                    RequestToAccount: requestToAccount,
                    Amount: amount,
                    Remarks: remarks,
                });

            });


            await test.step('Click Next', async () => {
                await requestMoneyPage.clickNext();
            });

            await test.step('Click Confirm', async () => {
                await requestMoneyPage.clickConfirm();
            });

            await test.step('Verify success receipt', async () => {

                await allure.attachment(
                    "Receipt Verification Data",
                    `RecipientMobile: ${recipientMobile}\n` +
                    `Amount: ${amount}\n`,
                    "text/plain"
                );

                await requestMoneyPage.verifySuccessReceipt(
                    recipientMobile,
                    amount,
                    username);

            });

            await test.step('Logout', async () => {
                try { await loginPage.logout(); } catch { /* ignore */ }
            });
        });
    });
});
