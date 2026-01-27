import { test, Page } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { PayToMobilePage } from '../pages/PayToMobilePage';
import { OwnBankTransferPage } from '../pages/OwnAccountTransferPage';
import { MobileTopUpPage } from '../pages/MobileTopUpPage';
import * as allure from "allure-js-commons";

const getCsvValue = (row: Record<string, string>, columnName: string): string => {
    const matchedKey = Object.keys(row).find(
        key => key.trim().toLowerCase() === columnName.trim().toLowerCase()
    );
    return matchedKey ? String(row[matchedKey]).trim() : '';
};

async function openPayToMobileViaQuickLink(page: Page) {
    const selector = '//div[contains(@class,"row-header")]//a[normalize-space()="Pay to Mobile"]';
    const link = page.locator(selector).first();
    await link.waitFor({ state: 'visible', timeout: 10000 });
    await link.click();
}

async function openOwnAccountViaQuickLink(page: Page) {
    const selector = '//div[contains(@class,"row-header")]//a[normalize-space()="Own Account Transfer"]';
    const link = page.locator(selector).first();
    await link.waitFor({ state: 'visible', timeout: 10000 });
    await link.click();
}

async function openMobileTopUpViaQuickLink(page: Page) {
    const selector = '//div[contains(@class,"row-header")]//a[normalize-space()="Mobile Top Up"]';
    const link = page.locator(selector).first();
    await link.waitFor({ state: 'visible', timeout: 10000 });
    await link.click();
}

test.afterEach(async ({ page, context }) => {
    try { await new LoginPage(page).logout(); } catch { }
    try { await context.close(); } catch { }
});

// ===================================================================
//  QUICK LINK 1 — PAY TO MOBILE 
// ===================================================================
test.describe('[QuickLink] Pay To Mobile', () => {
    const testRows = readCsvData('TestData_PayToMobile.csv');

    const positiveRows = testRows.filter(r =>
        (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false' &&
        (getCsvValue(r, 'flow') || '').toLowerCase() === 'positive'
    );

    positiveRows.forEach((row, index) => {
        const scenarioName = getCsvValue(row, 'ScenarioName') || `Scenario ${index + 1}`;
        const mobile = getCsvValue(row, 'RecipientMobile') || `Row${index + 1}`;

        test(`[QuickLink-POSITIVE] ${scenarioName} - [${mobile}]`, async ({ page }) => {
            const login = new LoginPage(page);
            const ptm = new PayToMobilePage(page);

            await login.goto();
            await login.login(getCsvValue(row, 'Username'), getCsvValue(row, 'Password'));

            await openPayToMobileViaQuickLink(page);

            await ptm.enterRecipientMobile(mobile);
            await ptm.assertRecipientMobileHasMauritiusCode();
            await ptm.clickSearchUser();

            await ptm.selectFromAccount(getCsvValue(row, 'FromAccount'));
            await ptm.selectCurrency(getCsvValue(row, 'Currency'));

            await ptm.assertAmountFieldAvailable();
            await ptm.enterAmount(getCsvValue(row, 'Amount'));
            await ptm.enterRemarks(getCsvValue(row, 'Remarks'));

            await ptm.clickNext();
            await ptm.waitForConfirmationPage();
        });
    });

    const negativeRows = testRows.filter(r =>
        (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false' &&
        (getCsvValue(r, 'flow') || '').toLowerCase() === 'negative'
    );

    negativeRows.forEach((row, index) => {
        const scenarioName = getCsvValue(row, 'ScenarioName') || `Negative ${index + 1}`;
        const mobile = getCsvValue(row, 'RecipientMobile') || `Row${index + 1}`;

        test(`[QuickLink-NEGATIVE] ${scenarioName} - [${mobile}]`, async ({ page }) => {
            const login = new LoginPage(page);
            const ptm = new PayToMobilePage(page);

            await login.goto();
            await login.login(getCsvValue(row, 'Username'), getCsvValue(row, 'Password'));

            await openPayToMobileViaQuickLink(page);

            await ptm.enterRecipientMobile(mobile);
            await ptm.clickSearchUser();

            if (await ptm.isMobileNotEligibleBannerVisible()) {
                await ptm.assertMobileNotEligibleBanner();
                return;
            }

            if (await ptm.isInlineMobileErrorVisible()) {
                await ptm.assertInvalidMobileCountryCode();
                return;
            }

            if (getCsvValue(row, 'FromAccount')) await ptm.selectFromAccount(getCsvValue(row, 'FromAccount'));
            if (getCsvValue(row, 'Currency')) await ptm.selectCurrency(getCsvValue(row, 'Currency'));
            if (getCsvValue(row, 'Amount')) await ptm.enterAmount(getCsvValue(row, 'Amount'));
            if (getCsvValue(row, 'Remarks')) await ptm.enterRemarks(getCsvValue(row, 'Remarks'));

            await ptm.clickNext();

            const expected = getCsvValue(row, 'Error_Message');

            if (/greater than available balance/i.test(expected)) {
                await ptm.assertAmountGreaterThanBalance();
            } else if (/remarks is required/i.test(expected)) {
                await ptm.assertRemarksRequired();
            } else if (expected) {
                await ptm.assertAmountInvalid(expected);
            }
        });
    });
});

// ===================================================================
//  QUICK LINK 2 — OWN ACCOUNT TRANSFER 
// ===================================================================
test.describe('[QuickLink] Own Account Transfer', () => {
    const rows = readCsvData('TestData_OwnBankTransfer.csv');

    const positive = rows.filter(r =>
        (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false' &&
        (getCsvValue(r, 'flow') || '').toLowerCase() === 'positive'
    );

    const negative = rows.filter(r =>
        (getCsvValue(r, 'enabled') || '').toLowerCase() !== 'false' &&
        (getCsvValue(r, 'flow') || '').toLowerCase() === 'negative'
    );

    positive.forEach((row, i) => {
        const label = getCsvValue(row, 'ScenarioName') || `Positive ${i + 1}`;

        test(`[QuickLink-POSITIVE] ${label}`, async ({ page }) => {
            const login = new LoginPage(page);
            const own = new OwnBankTransferPage(page);

            await login.goto();
            await login.login(getCsvValue(row, 'Username'), getCsvValue(row, 'Password'));

            await openOwnAccountViaQuickLink(page);

            await own.selectFromAccount(getCsvValue(row, 'fromAccount'));
            await own.selectToAccount(getCsvValue(row, 'toAccount'));
            await own.selectCurrency(getCsvValue(row, 'currency'));
            await own.enterAmount(getCsvValue(row, 'amount'));
            await own.enterRemarks(getCsvValue(row, 'remarks'));

            const freq = getCsvValue(row, 'frequency');
            const recurring = getCsvValue(row, 'recurring').toLowerCase();

            if (freq || recurring === 'yes' || recurring === 'true') {
                await own.enableRecurring();
                if (freq) await own.selectFrequency(freq);
            }

            await own.clickTransfer();

            await own.expectConfirmFromAccountContains(getCsvValue(row, 'fromAccount'));
            await own.expectConfirmToAccountContains(getCsvValue(row, 'toAccount'));
            await own.expectConfirmAmountNumeric(getCsvValue(row, 'amount'));
            await own.expectConfirmRemarksEquals(getCsvValue(row, 'remarks'));
            await own.expectConfirmRecurring(freq ? 'Yes' : 'No');

            await own.clickConfirm();

            await own.expectSuccessAmountNumeric(getCsvValue(row, 'amount'));
            await own.expectSuccessCurrencyEquals(getCsvValue(row, 'currency'));
            await own.expectSuccessToAccountContains(getCsvValue(row, 'toAccount'));
            await own.expectSuccessRemarksEquals(getCsvValue(row, 'remarks'));
            await own.expectSuccessRecurring(freq ? 'Yes' : 'No');
        });
    });

    negative.forEach((row, i) => {
        const label = getCsvValue(row, 'ScenarioName') || `Negative ${i + 1}`;

        test(`[QuickLink-NEGATIVE] ${label}`, async ({ page }) => {
            const login = new LoginPage(page);
            const own = new OwnBankTransferPage(page);

            await login.goto();
            await login.login(getCsvValue(row, 'Username'), getCsvValue(row, 'Password'));

            await openOwnAccountViaQuickLink(page);

            if (getCsvValue(row, 'fromAccount'))
                await own.selectFromAccount(getCsvValue(row, 'fromAccount'));
            if (getCsvValue(row, 'toAccount'))
                await own.selectToAccount(getCsvValue(row, 'toAccount'));
            if (getCsvValue(row, 'currency'))
                await own.selectCurrency(getCsvValue(row, 'currency'));
            if (getCsvValue(row, 'amount'))
                await own.enterAmount(getCsvValue(row, 'amount'));
            if (getCsvValue(row, 'remarks'))
                await own.enterRemarks(getCsvValue(row, 'remarks'));

            await own.clickTransferNoConfirmWait();

            const err = getCsvValue(row, 'expectedErrors');
            if (err.includes('Amount')) await own.expectAmountError(err);
            else if (err.includes('To Account')) await own.expectToAccountError(err);
            else if (err.includes('Remarks')) await own.expectRemarksError(err);
            else await own.expectInlineError(err);
        });
    });
});

// ===================================================================
//  QUICK LINK 3 — MOBILE TOP UP 
// ===================================================================
test.describe('[QuickLink] Mobile Top Up', () => {
    const rows = readCsvData('TestData_MobileTopUp.csv');

    rows.forEach((row, index) => {
        const label = getCsvValue(row, 'scenarioName') || `Scenario ${index + 1}`;

        test(`[QuickLink] Mobile Top Up - ${label}`, async ({ page }) => {
            const login = new LoginPage(page);
            const mobile = new MobileTopUpPage(page);

            await login.goto();
            await login.login(getCsvValue(row, 'Username'), getCsvValue(row, 'Password'));

            await openMobileTopUpViaQuickLink(page);

            await page.click('//p[normalize-space()="Mobile TopUp"]/ancestor::a');

            await mobile.selectBiller(getCsvValue(row, 'Billers'));
            await mobile.enterSaveAs(getCsvValue(row, 'SaveAs'));
            await mobile.selectFromAccount(getCsvValue(row, 'FromAccount'));
            await mobile.enterMobileNumber(getCsvValue(row, 'MobileNumber'));
            await mobile.selectAmount(getCsvValue(row, 'Amount'));

            await mobile.clickPay();
            await mobile.clickConfirm();

            await mobile.assertReceipt({
                expectedDate: getCsvValue(row, 'ExpectedDate'),
                expectedCurrency: getCsvValue(row, 'ExpectedCurrency') || 'MUR',
                expectedAmount: getCsvValue(row, 'Amount'),
                expectedFromAccount: getCsvValue(row, 'FromAccount'),
                expectedMobileWithCode: `+230${getCsvValue(row, 'MobileNumber')}`,
                expectedRemarks: getCsvValue(row, 'Remarks')
            });

            await mobile.clickClose();
        });
    });
});
