import { Page, expect, Locator } from "@playwright/test";
import { parseCurrencyToNumber } from "../Utils/currency";

export class ReloadPrepaidCardPage {
    constructor(private page: Page) {}

    // ---------- Locators ----------
    private menuPayTransfer = this.page.getByRole("link", { name: /Pay & Transfer/i });
    private menuRecharge = this.page.getByRole("menuitem", { name: /Recharge My Prepaid Card/i });

    private fromAccountField = this.page.locator("//mat-label[text()='From Account']/ancestor::mat-form-field");

    // ⭐ NEW — Pay/Transfer To dropdown
    private payTransferToField = this.page.locator("//mat-label[normalize-space()='Pay/Transfer To']/ancestor::mat-form-field");

    // ⭐ NEW — Amount & Remarks
    private amountInputField = this.page.locator("//input[@id='transaction_amount']");
    private remarksField = this.page.locator("//textarea[@formcontrolname='remarks']");

    private transferBtn = this.page.getByRole("button", { name: /^Transfer$/i });
    private confirmBtn = this.page.getByRole("button", { name: /^Confirm$/i });
    private successMessage = this.page.getByText(/Transfer successful/i);

    // ---------- Navigation ----------
    async openFromTopNav() {
        await this.page
            .locator("//li[@id='TRANSACTIONS_hor']//span[contains(text(),'Pay & Transfer')]")
            .click();

        await this.page
            .locator("//li[@id='TRANSACTIONS_hor']//ul[contains(@class,'sub-menu')]")
            .waitFor({ state: "visible" });

        await this.page
            .locator("//li[@id='prepaid-card-recharge_hor']//a")
            .click();

        await expect(
            this.page.getByRole("heading", { name: /Recharge My Prepaid Card/i })
        ).toBeVisible({ timeout: 10000 });
    }

    // ---------- From Account ----------
    async selectFromAccount(target: string) {
        await this.fromAccountField.click();

        await this.page
            .locator(`//mat-option[.//p[contains(text(),'${target.slice(-4)}')]]`)
            .first()
            .click();
    }

    // ---------- ⭐ NEW: Pay/Transfer To ----------
    async selectPayTransferTo(targetLast4: string) {
        await this.payTransferToField.click();

        await this.page
            .locator(`//mat-option[.//p[contains(text(),'${targetLast4}')]]`)
            .first()
            .click();
    }

    // ---------- Read Balances ----------
    async readFromAccountBalance(): Promise<number> {
        const bal = await this.page
            .locator("//mat-label[text()='From Account']/ancestor::div[1]//p[contains(@class,'balance')]")
            .innerText();

        return parseCurrencyToNumber(bal);
    }

    async readToAccountBalance(): Promise<number> {
        const bal = await this.page
            .locator("//mat-label[contains(text(),'Pay/Transfer To')]/ancestor::div[1]//p[contains(@class,'balance')]")
            .innerText();

        return parseCurrencyToNumber(bal);
    }

    // ---------- Fill Form ----------
    async fillForm(amount: string, remarks: string) {
        const amountBox = this.page.locator("input#transaction_amount");
        await amountBox.scrollIntoViewIfNeeded();
        await amountBox.fill("");
        await amountBox.type(amount, { delay: 50 });

        const remarksBox = this.page.locator("input#fundstransfer_srcnarrative");
        await remarksBox.scrollIntoViewIfNeeded();
        await remarksBox.fill("");
        await remarksBox.type(remarks, { delay: 50 });
    }

    // ---------- Confirm ----------
    async goToConfirm() {
        await this.transferBtn.click();
        await expect(this.confirmBtn).toBeVisible();
    }

    async submit() {
        await this.confirmBtn.click();
    }

    async waitForSuccess() {
        await expect(this.successMessage).toBeVisible({ timeout: 20000 });
    }

    // ---------- Confirm Page Amount ----------
    async getConfirmAmount(): Promise<number> {
        const txt = await this.page.locator("//p[contains(text(),'Amount')]/following-sibling::p").innerText();
        return parseCurrencyToNumber(txt);
    }

    async getConfirmExchangeRate(): Promise<number> {
        const txt = await this.page.locator("//p[contains(text(),'Exchange Rate')]/following-sibling::p").innerText();
        return Number(txt.trim());
    }

    // ---------- FX Validation ----------
    async validatePostTransactionBalances(
        beforeFrom: number,
        beforeTo: number,
        currency: string,
        amount: string
    ) {
        const amt = Number(amount);

        const afterFrom = await this.readFromAccountBalance();
        const afterTo = await this.readToAccountBalance();

        if (currency === "MUR") {
            expect(beforeFrom - afterFrom).toBeCloseTo(amt, 1);
            expect(afterTo - beforeTo).toBeCloseTo(amt, 1);
        } else {
            const rate = await this.getConfirmExchangeRate();
            const expectedDebit = amt * rate;

            expect(beforeFrom - afterFrom).toBeCloseTo(expectedDebit, 1);
            expect(afterTo - beforeTo).toBeCloseTo(amt, 1);
        }
    }
}
