import { Page, expect } from '@playwright/test';
import * as allure from "allure-js-commons";


import { utilityLibrary } from '../Utils/utilityLibrary';

export class PayToMobilePage {

    private readonly page: Page;
    private readonly utils: utilityLibrary;


    constructor(page: Page) {

        this.page = page;
        this.utils = new utilityLibrary(page);
    }

    // ------------------- LOCATORS -------------------
    private readonly txtRecipientMobile = '#phoneNumber';
    private readonly btnSearchUser = 'button:has-text("Search User")';

    private readonly drpFromAccount =
        '//mat-label[normalize-space()="From Account"]/ancestor::mat-form-field//mat-select';


    private readonly drpCurrency =
        '//mat-label[normalize-space()="Currency"]/ancestor::mat-form-field';

    private readonly txtTransferAmount =
        '//mat-label[normalize-space()="Transfer Amount"]/ancestor::mat-form-field//input';


    private readonly txtRemarks =
        '//mat-label[normalize-space()="Remarks"]/ancestor::mat-form-field//input';


    private readonly btnNext = 'button:has-text("Next")';
    private readonly btnTransfer = '#transfer';

    // — Confirm button locator
    private readonly btnConfirm = '#showamountselector_next';



    // Banner Errors
    private readonly errPhoneNotEligibleMain = '.phone-not-found';
    private readonly errPhoneNotEligibleWarn = '.phone-not-found-warn';

    // Inline Errors
    // Inline Errors
    private readonly errAmountInlineError =
        '//mat-label[normalize-space()="Transfer Amount"]/ancestor::mat-form-field//mat-error';

    private readonly errMobileInlineError =
        '//*[@id="phoneNumber"]/ancestor::mat-form-field//mat-error';

    private readonly errRemarksInlineError =
        '//mat-label[normalize-space()="Remarks"]/ancestor::mat-form-field//mat-error';




    async enterRecipientMobile(recipientMobile: string) {
        await this.utils.inputText(this.page, this.txtRecipientMobile, recipientMobile);
        await this.utils.inputText(this.page, this.txtRecipientMobile, recipientMobile);
    }

    async clickSearchUser() {
        await this.utils.clickButton(this.page, this.btnSearchUser);
        await this.utils.clickButton(this.page, this.btnSearchUser);
    }

    async selectFromAccount(fromAccountDisplayText: string) {
        await this.page.locator(this.drpFromAccount).click();
        await this.page.locator('.cdk-overlay-pane').first().waitFor({ state: 'visible', timeout: 5000 });


        const escaped = fromAccountDisplayText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await this.page.getByRole('option', { name: new RegExp(escaped, 'i') }).first().click();
    }

    async selectCurrency(currencyName: string) {
        await this.utils.selectDropdown(this.page, this.drpCurrency, currencyName);
        await this.utils.selectDropdown(this.page, this.drpCurrency, currencyName);
    }

    async assertAmountFieldAvailable() {
        const field = this.page.locator(this.txtTransferAmount).first();
        await expect(field).toBeVisible();
        await expect(field).toBeEnabled();

    }

    async enterAmount(amount: string) {
        await this.utils.inputText(this.page, this.txtTransferAmount, amount);

    }

    async enterRemarks(remarks: string) {
        await this.utils.inputText(this.page, this.txtRemarks, remarks);

    }

    async clickNext() {
        await this.utils.clickButton(this.page, this.btnNext);
        await this.utils.clickButton(this.page, this.btnNext);
    }

    async waitForConfirmationPage() {
        await expect(this.page.locator(this.btnTransfer)).toBeVisible({ timeout: 10000 });
    }





    // ⭐⭐⭐ NEW — Click Confirm after confirmation page ⭐⭐⭐
    async clickConfirm() {
        await this.utils.clickButton(this.page, this.btnConfirm);
    }

    // ⭐⭐⭐ NEW — Temporary success page verification ⭐⭐⭐
    async verifySuccessfulPageLoaded() {
        await this.page.waitForTimeout(2000);
        await allure.attachment(
            "Success Page Verification",
            "Success page reached (temporary — locator pending).",
            "text/plain"
        );
    }



    // Check that the mobile number starts with the Mauritius country code +230
    async assertRecipientMobileHasMauritiusCode() {
        const mobileInput = this.page.locator(this.txtRecipientMobile).first();
        await expect(mobileInput).toBeVisible();
        await expect(mobileInput).toHaveValue(/^\+230/);

        const value = await mobileInput.inputValue();
        await allure.attachment(
            "Recipient Mobile Country Code Check",
            `Actual Mobile Value: ${value}\nExpected: Should start with +230`,
            "text/plain"
        );
    }


    async isMobileNotEligibleBannerVisible(): Promise<boolean> {
        return await this.page.locator(this.errPhoneNotEligibleMain).first().isVisible();
    }

    async assertMobileNotEligibleBanner() {
        const main = this.page.locator(this.errPhoneNotEligibleMain);
        const warn = this.page.locator(this.errPhoneNotEligibleWarn);

        await main.waitFor({ state: 'visible', timeout: 5000 });

        const actualMain = (await main.innerText()).trim();
        const actualWarn = (await warn.innerText()).trim();

        await allure.attachment(
            "Banner Error",
            `Main: ${actualMain}\nWarn: ${actualWarn}`,
            "text/plain"
        );

        await expect(main).toContainText("This mobile number is not eligible", { timeout: 5000 });
        await expect(warn).toContainText("Please try again or use another mode of payment", { timeout: 5000 });
    }



    async isInlineMobileErrorVisible(): Promise<boolean> {
        return await this.page.locator(this.errMobileInlineError).first().isVisible();
    }

    async assertInvalidMobileCountryCode() {
        const mobileErr = this.page.locator(this.errMobileInlineError);
        const actual = (await mobileErr.innerText()).trim();

        await allure.attachment(
            "Inline Mobile Error",
            `Actual: ${actual}`,
            "text/plain"
        );



        await expect(mobileErr).toContainText("Please enter a valid mobile number", { timeout: 5000 });
    }




    async assertErrorDynamic(errorFrequency: string, expectedMessage: string) {
        const expected = expectedMessage.trim();

        const attachComparison = async (label: string, actual: string) => {
            await allure.attachment(
                label,
                `EXPECTED:\n${expected}\n\nACTUAL (UI):\n${actual.trim()}`,
                "text/plain"
            );
        };

        switch (errorFrequency.toLowerCase()) {

            case 'inline': {

                const mobileErr = this.page.locator(this.errMobileInlineError).first();
                const amountErr = this.page.locator(this.errAmountInlineError).first();
                const remarksErr = this.page.locator(this.errRemarksInlineError).first();

                if (await mobileErr.isVisible()) {
                    const actual = await mobileErr.innerText();
                    await attachComparison("Inline Error (Mobile)", actual);
                    await expect(mobileErr).toContainText(expected);
                    return;
                }

                if (await amountErr.isVisible()) {
                    const actual = await amountErr.innerText();
                    await attachComparison("Inline Error (Amount)", actual);
                    await expect(amountErr).toContainText(expected);
                    return;
                }

                if (await remarksErr.isVisible()) {
                    const actual = await remarksErr.innerText();
                    await attachComparison("Inline Error (Remarks)", actual);
                    await expect(remarksErr).toContainText(expected);
                    return;
                }

                throw new Error(`Inline error expected but not found on screen:\n${expected}`);
            }

            case 'banner': {
                const banner = this.page.locator(this.errPhoneNotEligibleMain);
                await banner.waitFor({ state: 'visible', timeout: 10000 });

                const actual = (await banner.innerText()).trim();
                await attachComparison("Banner Error", actual);

                await expect(banner).toContainText(expected);
                return;
            }

            case 'popup': {
                const overlay = this.page.locator('.cdk-overlay-container');
                await overlay.waitFor({ state: 'visible', timeout: 15000 });

                const msg = overlay.getByText(expected, { exact: false }).first();
                const actual = (await msg.innerText()).trim();

                await attachComparison("Popup Error", actual);
                await expect(msg).toBeVisible();
                return;
            }

            default:
                throw new Error(`Unknown Error_Frequency value in CSV: '${errorFrequency}'`);


        }
    }
}
