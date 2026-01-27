import { Page, expect } from '@playwright/test';
import { utilityLibrary } from '../Utils/utilityLibrary';

export class MobileTopUpPage {
    private readonly page: Page;
    private readonly util: utilityLibrary;

    constructor(page: Page) {
        this.page = page;
        this.util = new utilityLibrary(page);
    }

    // ---------- Navigation (scoped to horizontal menu) ----------
    private readonly payAndTransferMenu = '#TRANSACTIONS_hor > a.menu-link';
    private readonly billPaymentsLink = '#billpay_hor > a.menu-link';
    private readonly mobileTopUpTile = '//p[normalize-space()="Mobile TopUp"]/ancestor::a';

    // ---------- Form fields ----------
    private readonly saveAsInput = '#template_name';

    // From Account field (we'll click the trigger inside this field)
    private readonly fromAccountField = '//mat-label[normalize-space()="From Account"]/ancestor::mat-form-field';
    private readonly fromAccountTrigger = `${this.fromAccountField}//div[contains(@class,"mat-mdc-select-trigger")]`;

    private readonly mobileNumberInput = '#template_customer_reference';

    // Amount field (same Angular Material select)
    private readonly amountField = '//mat-label[normalize-space()="Amount"]/ancestor::mat-form-field';
    private readonly amountTrigger = `${this.amountField}//div[contains(@class,"mat-mdc-select-trigger")]`;

    // ---------- Buttons ----------
    private readonly payButton = '//button[normalize-space()="Pay"]';
    private readonly confirmButton = '//button[normalize-space()="Confirm"]';
    private readonly closeButton = '//button[normalize-space()="Close"]';

    // ---------- Actions ----------
    async openBillPaymentsPage() {
        await this.util.clickButton(this.page, this.payAndTransferMenu);
        await this.util.clickButton(this.page, this.billPaymentsLink);
    }

    async openMobileTopUpPage() {
        await this.util.clickButton(this.page, this.mobileTopUpTile);
    }

    async selectBiller(billerName: string) {
        const billerTile = `//p[normalize-space()="${billerName}"]`;
        await this.util.clickButton(this.page, billerTile);
    }

    async enterSaveAs(value: string) {
        await this.util.inputText(this.page, this.saveAsInput, value);
    }

    /**
     * Opens the "From Account" mat-select and chooses the option that contains the
     * CSV account number (works even if UI shows currency/balance next to it).
     * Uses your panelClass "account-select".
     */
    async selectFromAccount(accountNumber: string) {
        // Click trigger (primary)
        await this.util.clickButton(this.page, this.fromAccountTrigger);

        // Prefer the custom panelClass; fall back to material panel if needed
        let panel = this.page.locator('.cdk-overlay-pane .account-select');

        // Wait for visible; if not, try arrow or keyboard open once
        try {
            await panel.waitFor({ state: 'visible', timeout: 6000 });
        } catch {
            // Fallback 1: click the arrow
            const field = this.page.locator(this.fromAccountField);
            await field.locator('.mat-mdc-select-arrow').click().catch(() => { });
            panel = this.page.locator('.cdk-overlay-pane .account-select, .cdk-overlay-pane .mat-mdc-select-panel');
            await panel.waitFor({ state: 'visible', timeout: 6000 }).catch(async () => {
                // Fallback 2: keyboard open
                await field.press('Alt+ArrowDown');
                await panel.waitFor({ state: 'visible', timeout: 6000 });
            });
        }

        // Click the option that contains the CSV number
        const option = panel.locator('mat-option', { hasText: accountNumber }).first();
        await option.scrollIntoViewIfNeeded();
        await option.click();
    }

    async enterMobileNumber(value: string) {
        await this.util.inputText(this.page, this.mobileNumberInput, value);
    }

    /**
     * Opens the Amount dropdown and selects an option that contains the CSV value.
     * (Keeps it robust if app shows extra text around the amount.)
     */
    async selectAmount(amountLabel: string) {
        await this.util.clickButton(this.page, this.amountTrigger);

        let panel = this.page.locator('.cdk-overlay-pane .mat-mdc-select-panel');
        try {
            await panel.waitFor({ state: 'visible', timeout: 6000 });
        } catch {
            const field = this.page.locator(this.amountField);
            await field.locator('.mat-mdc-select-arrow').click().catch(() => { });
            panel = this.page.locator('.cdk-overlay-pane .mat-mdc-select-panel');
            await panel.waitFor({ state: 'visible', timeout: 6000 });
        }

        await panel.locator('mat-option', { hasText: amountLabel }).first().click();
    }

    async clickPay() {
        await this.util.clickButton(this.page, this.payButton);
    }

    async clickConfirm() {
        await this.util.clickButton(this.page, this.confirmButton);
    }

    async clickClose() {
        await this.util.clickButton(this.page, this.closeButton);
    }

    // ================== RECEIPT HELPERS (UPDATED) ==================

    // Use the Angular Material dialog container as the root for the receipt
    private readonly receiptRoot = 'mat-dialog-container';

    // Wait for receipt/dialog to appear – scoped by success text
    async waitForReceipt() {
        const root = this.page
            .locator(this.receiptRoot, { hasText: 'processed successfully' })
            .first();

        await expect(root).toBeVisible({ timeout: 15000 });
    }

    // Get the value (right column) for a two-col row by label text (e.g., "Amount")
    private async getReceiptValue(label: string): Promise<string> {
        const row = this.page
            .locator(`${this.receiptRoot} .two-col-grid`, { hasText: label })
            .first();
        await expect(row).toBeVisible();
        const val = await row.locator('.mat-body-strong').last().innerText();
        return val.replace(/\u00A0/g, ' ').trim();
    }

    // Extract reference id from the success message
    async getReferenceId(): Promise<string> {
        const successP = this.page
            .locator(`${this.receiptRoot} p.mat-subtitle-2.align-center`, {
                hasText: 'processed successfully'
            })
            .first();
        await expect(successP).toBeVisible();
        const text = (await successP.innerText()).replace(/\u00A0/g, ' ').trim();
        const m = /eBanking reference is\s+(\d+)/i.exec(text);
        expect(m, 'Reference ID should be present in success message').not.toBeNull();
        return m ? m[1] : '';
    }

    // Simple wrapper to assert the full receipt content
    async assertReceipt(opts: {
        expectedDate: string;
        expectedCurrency: string;   // e.g., "MUR"
        expectedAmount: string;     // e.g., "50.00"
        expectedFromAccount: string;
        expectedMobileWithCode: string; // e.g., "+23059620015"
        expectedRemarks?: string;
    }) {
        // Ensure dialog is visible
        await this.waitForReceipt();

        // 1) Reference ID present
        const refId = await this.getReferenceId();
        expect(refId).toMatch(/^\d+$/);

        // 2) Date
        const dateOnReceipt = await this.getReceiptValue('Transaction Date');
        expect(dateOnReceipt).toBe(opts.expectedDate);

        // 3) Currency
        const currencyOnReceipt = await this.getReceiptValue('Transaction Currency');
        expect(currencyOnReceipt).toBe(opts.expectedCurrency);

        // 4) Amount (allow commas in thousands, but keep currency + amount)
        const amountOnReceipt = (await this.getReceiptValue('Amount')).replace(/,/g, '').replace(/\s+/g, ' ').trim();
        const expectedAmountPattern = new RegExp(`^${opts.expectedCurrency}\\s*${opts.expectedAmount.replace(/,/g, '')}$`, 'i');
        expect(amountOnReceipt.replace(/\u00A0/g, ' ')).toMatch(expectedAmountPattern);

        // 5) From Account (ensure account number appears)
        const fromOnReceipt = (await this.getReceiptValue('From')).replace(/\s+/g, ' ').trim();
        expect(new RegExp(opts.expectedFromAccount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(fromOnReceipt))
            .toBeTruthy();

        // 6) Mobile number (present anywhere in the receipt text: e.g., under Remarks)
        const allReceiptText = (await this.page.locator(this.receiptRoot).innerText()).replace(/\u00A0/g, ' ');
        expect(new RegExp(opts.expectedMobileWithCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(allReceiptText))
            .toBeTruthy();

        // 7) Remarks (optional)
        if (opts.expectedRemarks && opts.expectedRemarks.trim()) {
            const remarksOnReceipt = (await this.getReceiptValue('Remarks')).replace(/\s+/g, ' ').trim();
            expect(new RegExp(opts.expectedRemarks.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(remarksOnReceipt))
                .toBeTruthy();
        }
    }
}
