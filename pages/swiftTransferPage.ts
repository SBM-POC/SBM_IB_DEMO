import { Page, Locator, expect } from '@playwright/test';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';

export interface SwiftTransferFormData {
    scenarioName: string;
    fromAccountNumber: string;
    currency: string;
    remittanceAmount: string;
    beneficiaryCountry: string;
    beneficiaryAccountIban: string;
    beneficiaryName: string;
    beneficiaryAddress1: string;
    beneficiaryAddress2?: string;
    beneficiaryBankBic: string;
    intermediaryBankBic?: string;
    chargeOption?: string;
    remarks: string;
}

export class SwiftTransferPage {
    constructor(private readonly page: Page) { }

    // Navigation
    private get payAndTransferMenu() {
        return this.page.locator('#TRANSACTIONS_hor a.menu-link:has-text("Pay & Transfer")').first();
    }
    private get swiftTransferLink() {
        return this.page.locator('#TRANSACTIONS_hor a.menu-link:has-text("SWIFT Transfer")').first();
    }
    private get payOnceButton() {
        return this.page.locator('#ben_pay_once');
    }

    // Fields
    get amountField() { return this.page.locator('input#transaction_amount'); }
    get remarksField() { return this.page.locator('#beneficiary_payment_detail'); }

    async openForm() {
        await this.payAndTransferMenu.click();
        await this.swiftTransferLink.click();
        await waitForSpinnerToDisappear(this.page);

        await this.payOnceButton.waitFor({ state: 'visible', timeout: 30000 });
        await this.payOnceButton.click();

        await waitForSpinnerToDisappear(this.page);
    }

    // Helper locators
    private byLabel(label: string) {
        return this.page.getByLabel(new RegExp(`^\\s*${label}\\s*$`, 'i'));
    }

    private async openSelect(label: string): Promise<Locator> {
        await this.byLabel(label).click();
        const panel = this.page.locator('div.cdk-overlay-pane .mat-mdc-select-panel, .mat-select-panel');
        await panel.waitFor();
        return panel;
    }

    private async choose(panel: Locator, text: string | RegExp) {
        const option = panel.locator('.mat-mdc-option, .mat-option').filter({ hasText: text }).first();
        await option.click();
        await panel.waitFor({ state: 'detached' });
    }

    private async selectFromAccount(accountNumber: string) {
        await this.byLabel('From Account').click();

        const panel = this.page.locator('div.cdk-overlay-pane .mat-mdc-select-panel, .mat-select-panel');
        await panel.waitFor();

        const accNode = panel
            .locator('.mat-mdc-option .acc-number, .mat-option .acc-number')
            .filter({ hasText: accountNumber })
            .first();

        if (await accNode.count()) {
            await accNode.click();
        } else {
            await panel.locator('.mat-mdc-option, .mat-option').filter({ hasText: accountNumber }).first().click();
        }

        await panel.waitFor({ state: 'detached' });
    }

    // Assertions
    async assertCutoffToast() {
        const containers = this.page.locator('.mat-mdc-snack-bar-container');
        await containers.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => { });
        const count = await containers.count();
        if (count === 0) throw new Error('Cut-off time toast did not appear.');
        const toastText = containers.first().locator('.mat-mdc-snack-bar-label .wrapper p');
        await expect(toastText).toContainText(/Cut off time until/i);
        await containers.first().locator('button').first().click().catch(() => { });
        await waitForSpinnerToDisappear(this.page);
    }

    async assertToastContains(expected: string | RegExp) {
        const container = this.page.locator('.mat-mdc-snack-bar-container').first();
        await container.waitFor({ state: 'visible', timeout: 10000 });
        await expect(container.locator('.mat-mdc-snack-bar-label')).toContainText(expected);
        await container.locator('button').first().click().catch(() => { });
    }

    async assertInlineAmountErrorContains(expected: string | RegExp) {
        const error = this.amountField.locator('xpath=ancestor::mat-form-field//mat-error').first();
        await expect(error).toBeVisible({ timeout: 8000 });
        await expect(error).toContainText(expected);
    }

    async assertNoSpecialCharsRemain(field: Locator, disallowedChars: string) {
        const val = await field.inputValue();
        for (const ch of disallowedChars.split('')) {
            expect(val).not.toContain(ch);
        }
    }

    // Main form fill
    async fillForm(data: SwiftTransferFormData) {
        await this.selectFromAccount(data.fromAccountNumber);
        await this.choose(await this.openSelect('Currency'), new RegExp(`^\\s*${data.currency}\\s*$`, 'i'));
        await this.amountField.fill(String(data.remittanceAmount));
        await this.choose(await this.openSelect('Beneficiary Country'), new RegExp(`^\\s*${data.beneficiaryCountry}\\s*$`, 'i'));
        await this.page.locator('#beneficiary_recipientaccount').fill(data.beneficiaryAccountIban);
        await this.page.locator('#beneficiary_beneficiaryname').fill(data.beneficiaryName);
        await this.page.locator('#beneficiary_beneficiaryAddress1').fill(data.beneficiaryAddress1);
        if (data.beneficiaryAddress2) {
            await this.page.locator('#beneficiary_beneficiaryAddress2').fill(data.beneficiaryAddress2);
        }
        await this.page.locator('#beneficiary_swiftCode').fill(data.beneficiaryBankBic);
        await this.page.locator('#beneficiary_swift_code_check').first().click();
        await waitForSpinnerToDisappear(this.page);
        if (data.intermediaryBankBic) {
            await this.page.locator('#beneficiary_intermediaryBankBIC').fill(data.intermediaryBankBic);
            await this.page.locator('#beneficiary_swift_code_check').nth(1).click();
            await waitForSpinnerToDisappear(this.page);
        }
        if (data.chargeOption) {
            await this.choose(await this.openSelect('Charge Option'), new RegExp(data.chargeOption, 'i'));
        }
        await this.remarksField.fill(data.remarks);
    }

    async submitAndConfirm(_formData: SwiftTransferFormData) {
        await this.page.locator('button#save_or_pay_beneficiary').click();
        await this.page.getByRole('button', { name: /^Confirm$/ }).click().catch(() => { });
        await waitForSpinnerToDisappear(this.page);
    }

    async openConfirmDialog() {
        await this.page.locator('button#save_or_pay_beneficiary').click();
        await expect(this.page.getByRole('button', { name: /^\s*Confirm\s*$/ })).toBeVisible({ timeout: 15000 });
    }

    async confirmFromDialog() {
        await this.page.getByRole('button', { name: /^\s*Confirm\s*$/ }).click();
        await waitForSpinnerToDisappear(this.page);
    }

    async assertConfirmation(data: SwiftTransferFormData) {
        const dialogBody = this.page.locator('mat-dialog-content.mat-mdc-dialog-content');

        await expect(dialogBody.locator('[data-test-name="sourceNumber"]'))
            .toContainText(data.fromAccountNumber);

        await expect(dialogBody).toContainText(data.beneficiaryName);
        await expect(dialogBody).toContainText(data.beneficiaryAccountIban);
        await expect(dialogBody).toContainText(data.beneficiaryBankBic);

        if (data.beneficiaryAddress1) await expect(dialogBody).toContainText(data.beneficiaryAddress1);
        if (data.beneficiaryAddress2) await expect(dialogBody).toContainText(data.beneficiaryAddress2);

        await expect(dialogBody.locator('.amount-item')).toContainText(String(data.remittanceAmount));
        await expect(dialogBody).toContainText(data.remarks);

        if (data.intermediaryBankBic) await expect(dialogBody).toContainText(data.intermediaryBankBic);
        if (data.chargeOption) await expect(dialogBody).toContainText(data.chargeOption);
    }

    async closeSuccessDialog() {
        await this.page.getByRole('button', { name: /^Close$/ }).click().catch(() => { });
    }

    // ======================================================================
    // ✅ FIXED FUNCTION — Matches actual Success Dialog HTML structure
    // ======================================================================
    async verifySwiftSuccessDialog(data: SwiftTransferFormData) {

        const dialog = this.page.locator('mat-dialog-content.mat-mdc-dialog-content').first();
        await dialog.waitFor({ state: 'visible', timeout: 15000 });

        // 1. Title check
        await expect(dialog.getByText('Transfer successful')).toBeVisible();

        // 2. Helper to extract value from grid row
        const valueFor = async (label: string) => {
            const row = dialog.locator(`div.two-col-grid:has(div:text-is("${label}"))`);
            const val = await row.locator('.mat-body-strong').innerText();
            return val.trim().replace(/\s+/g, ' ');
        };

        // 3. Core validations
        await expect(await valueFor('Currency')).toBe(data.currency);
        await expect(await valueFor('Amount')).toContain(data.remittanceAmount);

        await expect(await valueFor('Beneficiary Name'))
            .toContain(data.beneficiaryName.trim());

        await expect(await valueFor('Beneficiary Account/IBAN'))
            .toContain(data.beneficiaryAccountIban.trim());

        await expect(await valueFor('Beneficiary Bank BIC'))
            .toContain(data.beneficiaryBankBic.trim());

        if (data.remarks) {
            await expect(await valueFor("Sender's Remarks"))
                .toContain(data.remarks.trim());
        }

        if (data.intermediaryBankBic) {
            const interm = await valueFor('Intermediary Bank Name and BIC');
            await expect(interm).toContain(data.intermediaryBankBic.trim());
        }

        if (data.chargeOption) {
            const charges = await valueFor('Charges');
            await expect(charges).toContain(data.chargeOption);
        }

        // 4. Capture Reference Id (Request Id)
        let referenceId = 'N/A';
        try {
            referenceId = await valueFor('Request Id');
        } catch (_) { }

        return referenceId;
    }
}
