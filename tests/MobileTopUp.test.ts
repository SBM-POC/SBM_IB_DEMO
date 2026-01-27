import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { MobileTopUpPage } from '../pages/MobileTopUpPage';
import { readCsvData } from '../Utils/readCsvData';
import { utilityLibrary } from '../Utils/utilityLibrary';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import { MyAccount } from '../pages/MyAccountPage';
import * as allure from "allure-js-commons";


const parseBalanceText = (txt: string) => {
    const clean = txt.replace(/\u00A0/g, ' ').trim();
    const m = /^\s*([A-Z]{3})\s+([\d,]+(?:\.\d{1,4})?)\s*$/.exec(clean);
    if (!m) throw new Error(`Unable to parse balance text: "${txt}"`);
    const currency = m[1];
    const amount = parseFloat(m[2].replace(/,/g, ''));
    return { currency, amount };
};

const toNumber = (v?: string) => {
    if (!v) return NaN;
    const n = v.replace(/[^\d.,-]/g, '').replace(/,/g, '');
    return Number(n);
};

const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const todayDDMMYYYY = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
};


const testData = readCsvData('TestData_MobileTopUp.csv');

test.describe('Mobile Top Up Positive', { tag: ['@E2E','@MobileTopUp','@SIA-57'] }, () => {
    for (const data of testData) {
        test(`${data.scenarioName} - ${data.flow}`, async ({ page }) => {
            const loginPage = new LoginPage(page);
            const mobileTopUp = new MobileTopUpPage(page);

            await test.step('Login', async () => {
                await loginPage.goto();
                await loginPage.login(data.Username, data.Password);
            });

            await test.step('Navigate: Pay & Transfer → Bill Payments → Mobile TopUp', async () => {
                await mobileTopUp.openBillPaymentsPage();
                await mobileTopUp.openMobileTopUpPage();
            });

            await test.step('Assert mobile operators are displayed', async () => {
                const operators = ['Emtel', 'My.T', 'MTML'];
                await Promise.all(
                    operators.map(name =>
                        expect(page.locator(`//p[normalize-space()="${name}"]`)).toBeVisible()
                    )
                );
            });

            await test.step(`Select biller: ${data.Billers}`, async () => {
                await mobileTopUp.selectBiller(data.Billers);
            });

            await test.step(`Enter "Save As": ${data.SaveAs}`, async () => {
                await mobileTopUp.enterSaveAs(data.SaveAs);
            });

            await test.step(`Select From Account: ${data.FromAccount}`, async () => {
                await mobileTopUp.selectFromAccount(data.FromAccount);
            });

            // Currency & available balance assertion (unchanged)
            await test.step('Assert currency & available balance for selected From Account', async () => {
                const balanceEl = page.locator('p.acc-balance').first();
                await expect(balanceEl).toBeVisible();

                const raw = (await balanceEl.innerText()).trim();
                const { currency, amount: available } = parseBalanceText(raw);

                const expectedCurrency = (data.ExpectedCurrency || '').trim();
                if (expectedCurrency) {
                    await expect.soft(currency).toBe(expectedCurrency);
                }

                const expectedMinBalance = toNumber(data.ExpectedMinBalance);
                if (!Number.isNaN(expectedMinBalance)) {
                    await expect.soft(available).toBeGreaterThanOrEqual(expectedMinBalance);
                }
            });

            await test.step(`Enter Mobile Number: ${data.MobileNumber}`, async () => {
                await mobileTopUp.enterMobileNumber(data.MobileNumber);
            });

            await test.step('Assert mobile number gets +230 prefix', async () => {
                const mobileField = page.locator('#template_customer_reference');
                await expect(mobileField).toHaveValue(new RegExp(`^\\+230\\s*${escapeReg(String(data.MobileNumber))}$`));
            });

            await test.step(`Select Amount: ${data.Amount}`, async () => {
                await mobileTopUp.selectAmount(data.Amount);
            });

            await test.step('Sanity: balance >= selected amount', async () => {
                const balanceEl = page.locator('p.acc-balance').first();
                const raw = (await balanceEl.innerText()).trim();
                const { amount: available } = parseBalanceText(raw);
                const topUpAmount = toNumber(String(data.Amount));
                if (!Number.isNaN(topUpAmount)) {
                    await expect.soft(available).toBeGreaterThanOrEqual(topUpAmount);
                }
            });

            await test.step('Pay', async () => {
                await mobileTopUp.clickPay();
            });

            await test.step('Confirm', async () => {
                await mobileTopUp.clickConfirm();
            });

            // ======== Clean one-liner: assert the receipt via the page object ========
            await test.step('Assert receipt contents', async () => {
                await mobileTopUp.assertReceipt({
                    expectedDate: (data.ExpectedDate || todayDDMMYYYY()).trim(),
                    expectedCurrency: (data.ExpectedCurrency || data.Currency || 'MUR').trim(),
                    expectedAmount: String(data.Amount || '').replace(/,/g, '').trim(),
                    expectedFromAccount: String(data.FromAccount || '').trim(),
                    expectedMobileWithCode: `+230${String(data.MobileNumber || '').trim()}`,
                    expectedRemarks: (data.Remarks || '').trim(),
                });
            });

            await test.step('Close', async () => {
                await mobileTopUp.clickClose();
            });

            await test.step('Logout', async () => {
                await loginPage.logout();
            });
        });
    }
});


test.describe('UI Check for Mobile Top Up – Account Visibility & Debit Eligibility', { tag: ['@E2E','@MobileTopUp','@SIA-73'] }, () => {

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
            const mobileTopUp = new MobileTopUpPage(page);

            // ===========================
            // LOGIN
            // ===========================
            await allure.step('Login', async () => {
                await loginPage.goto();
                await loginPage.login(username, password);
                await myAccount.assertMyAccountTabActive();
            });

            // ===========================
            // DASHBOARD ACCOUNT CHECK
            // ===========================
            if (displayOnScreen.toLowerCase() === 'yes') {

                await allure.step('Verify account visible on Dashboard', async () => {
                    await util.isPresentOnDashboard(page, accountType, accountNum, "Dashboard");
                });

                // ===========================
                // NAVIGATION TO MOBILE TOP UP > MTML
                // ===========================
                await allure.step('Navigate to Mobile Top Up > MTML', async () => {

                    // STEP 1 — click main Mobile Top Up link
                    await page.click('//a[contains(text(), "Mobile Top Up")]');

                    // STEP 2 — click the Mobile TopUp tile
                    await page.click('//p[normalize-space()="Mobile TopUp"]/ancestor::a');

                    // STEP 3 — click MTML provider tile
                    await page.click('//p[normalize-space()="MTML"]/ancestor::a');

                    await waitForSpinnerToDisappear(page);
                });

                // ===========================
                // FROM ACCOUNT DROPDOWN CHECK
                // ===========================
                if (allowDebit.toLowerCase() === 'yes') {

                    await allure.step('Verify account appears in From Account dropdown', async () => {
                        await util.CheckAccountInDropdown(
                            page,
                            // use the internal locator from MobileTopUpPage
                            (mobileTopUp as any).fromAccountTrigger,
                            accountNum
                        );
                    });

                } else {

                    await allure.step('Verify account DOES NOT appear in From Account dropdown', async () => {
                        await util.CheckAccountNotInDropdown(
                            page,
                            (mobileTopUp as any).fromAccountTrigger,
                            accountNum
                        );
                    });

                }
            }

            // ===========================
            // ACCOUNT SHOULD NOT DISPLAY
            // ===========================
            if (displayOnScreen.toLowerCase() === 'no') {

                await allure.step('Verify account NOT visible on Dashboard', async () => {
                    await util.isNotPresentOnDashboard(page, accountType, accountNum, "Dashboard");
                });
            }

        });
    }
});


