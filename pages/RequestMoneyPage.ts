import { Page, expect } from '@playwright/test';
import { utilityLibrary } from '../Utils/utilityLibrary';

export class RequestMoneyPage {
    private utils: utilityLibrary;

    constructor(private readonly page: Page) {
        this.utils = new utilityLibrary(page);
    }

    private get loc_requestFromInput() { return this.page.locator('#phoneNumber'); }
    private get loc_searchUserBtn() { return this.page.getByRole('button', { name: /^Search User$/i }); }
    private get loc_requestToAccountTrigger() {
        return this.page.locator(
            `//mat-label[normalize-space()="Request To Account"]/ancestor::mat-form-field` +
            `//div[contains(@class,"mat-mdc-select-trigger")]`
        );
    }
    private get loc_amountInput() { return this.page.locator('#transaction_amount'); }
    private get loc_remarksInput() { return this.page.locator('#fundstransfer_srcnarrative'); }
    private get loc_nextBtn() { return this.page.getByRole('button', { name: /^Next$/i }); }
    private get loc_confirmBtn() { return this.page.locator('#requestMoneyConfirmBtn'); }

    async fillRecipientMobile(mobileNumber: string): Promise<void> {
        await this.utils.inputText(this.page, '#phoneNumber', mobileNumber);
    }

    async clickSearchUser(): Promise<void> {
        await this.loc_searchUserBtn.click();
    }

    async selectRequestToAccount(accountLabel: string): Promise<void> {
        if (!accountLabel) {
            throw new Error('RequestToAccount value is missing in CSV');
        }
        await expect(this.loc_requestToAccountTrigger).toBeVisible({ timeout: 20000 });
        await this.loc_requestToAccountTrigger.click();

        const selectPanel = this.page.locator('.mat-mdc-select-panel');
        await selectPanel.waitFor({ state: 'visible', timeout: 15000 });

        const accountOption = selectPanel.locator(`mat-option:has-text("${accountLabel}")`);
        const optionCount = await accountOption.count();
        if (optionCount === 0) {
            throw new Error(`No matching account number found for "${accountLabel}"`);
        }
        await accountOption.first().click();
    }

    async enterAmount(amountValue: string): Promise<void> {
        await expect(this.loc_amountInput).toBeVisible({ timeout: 15000 });
        await this.utils.inputText(this.page, '#transaction_amount', amountValue);
    }

    async enterRemarks(remarksText: string): Promise<void> {
        await expect(this.loc_remarksInput).toBeVisible({ timeout: 15000 });
        await this.utils.inputText(this.page, '#fundstransfer_srcnarrative', remarksText ?? '');
    }

    async clickNext(): Promise<void> {
        await expect(this.loc_nextBtn).toBeVisible({ timeout: 15000 });
        await this.loc_nextBtn.click();
    }

    async clickConfirm(): Promise<void> {
        await expect(this.loc_confirmBtn).toBeVisible({ timeout: 20000 });
        await this.loc_confirmBtn.click();
    }

    async fillForm(params: {
        RecipientMobile: string;
        RequestToAccount: string;
        Amount: string;
        Remarks: string;
    }): Promise<void> {
        await this.fillRecipientMobile(params.RecipientMobile);
        await this.clickSearchUser();
        await this.selectRequestToAccount(params.RequestToAccount);
        await this.enterAmount(params.Amount);
        await this.enterRemarks(params.Remarks);
    }

    async waitUntilReady(): Promise<void> {
        await expect(this.loc_requestFromInput).toBeVisible({ timeout: 15000 });
        await expect(this.loc_searchUserBtn).toBeVisible({ timeout: 15000 });
    }

    private formatAmountOnly(amount: string): string {
        const numericAmount = Number(String(amount).replace(/[,\s]/g, ''));
        return isFinite(numericAmount) ? numericAmount.toFixed(2) : String(amount);
    }

    private plus230(msisdn: string): string {
        let normalizedMsisdn = String(msisdn).replace(/\s+/g, '');

        // If not already starting with +230
        if (!normalizedMsisdn.startsWith('+230')) {

            // If it starts with 230 → add the '+'
            if (normalizedMsisdn.startsWith('230')) {
                normalizedMsisdn = `+${normalizedMsisdn}`;
            }
            // Otherwise → clean any + and prepend +230
            else {
                normalizedMsisdn = `+230${normalizedMsisdn.replace(/^\+?/, '')}`;
            }
        }

        return normalizedMsisdn;
    }

    async verifySuccessReceipt(recipientMobile: string, amount: string, _username: string): Promise<void> {
        await this.utils.VerifyDomSuccesfulMessage(
            this.page,
            'text=The request was sent successfully!',
            'The request was sent successfully!',
            30000
        );

        await this.utils.VerifyDomSuccesfulMessage(
            this.page,
            '#paymentAmountInfo',
            this.formatAmountOnly(amount),
            15000
        );

        await this.utils.VerifyDomSuccesfulMessage(
            this.page,
            '#payeePhone',
            this.plus230(recipientMobile),
            15000
        );




    }

}

