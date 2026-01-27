import { Page, Locator, expect } from '@playwright/test';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import * as allure from "allure-js-commons";
import { utilityLibrary } from '../Utils/utilityLibrary';


export interface SwiftTransferFormData {
    fromAccountNumber: string;
    currency: string;
    remittanceAmount: string;
    beneficiaryCountry: string;
    beneficiaryAccountIban: string;
    beneficiaryName: string;
    beneficiaryAddress1: string;
    beneficiaryAddress2: string;
    beneficiaryBankBic: string;
    beneficiaryBankName: string;
    beneficiaryBankAddress: string;
    intermediaryBankBic: string;
    intermediaryBankName: string;
    chargeOption: string;
    remarks: string;
}
export interface SwiftTransferErrorData {
    errorMessageAmount: string;
    errorMessageBeneficiaryCountry: string;
    errorMessageBeneficiaryAccNo: string;
    errorMessageBeneficiaryName: string;
    errorMessageBeneficiaryAddress1: string;
    errorMessageBeneficiaryAddress2: string;
    errorMessageBeneficiaryBankBic: string;
    errorMessageBeneficiaryBankName: string;
    errorMessageBeneficiaryBankAddress: string;
    errorMessageChargeOption: string;
    errorMessageRemarks: string;
}


export class SwiftTransferPage {
        private readonly utilityLibraryPage: utilityLibrary;

    constructor(private readonly page: Page) {        this.utilityLibraryPage = new utilityLibrary(page)
 }


    //buttons
    private get payOnceButton() {
        return this.page.locator('#ben_pay_once');
    }
    public get btnPay() {
        return this.page.locator(`xpath=//button[contains(@id,'save_or_pay_beneficiary')]//span[@class='mdc-button__label']`);
    }
    public get btnConfirmPay() {
        return this.page.locator(`xpath=//button[contains(@id,'BW_button_021029')]//span[@class='mdc-button__label']`);
    }
    public get btnCloseDialog() {
        return this.page.locator(`xpath=//button[contains(@id,'BW_button_733369')]//span[@class='mdc-button__label']`);
    }

    // Fields
    private get ddlFromAccount() {
        return this.page.locator(`xpath=//mat-label[contains(text(),'From Account')]/../../mat-select`);
    }
    private get ddlCurrency() {
        return this.page.locator(`xpath=//mat-label[contains(text(),'Currency')]/../../mat-select`);
    }
    private get amountField() {
        return this.page.locator('input#transaction_amount');
    }
    public get errAmountField() {
        return this.page.locator(`xpath=//input[contains(@id,'transaction_amount')]//ancestor::mat-form-field//mat-error`);
    }
    private get ddlBeneficiaryCountry() {
        return this.page.locator(`xpath=//mat-label[contains(text(),'Beneficiary Country')]/../../mat-select`);
    }
    public get errBeneficiaryCountryField() {
        return this.page.locator(`xpath=//mat-label[contains(text(),'Beneficiary Country')]/ancestor::mat-form-field//mat-error`);
    }
    private get beneficiaryAccIBANField() {
        return this.page.locator('input#beneficiary_recipientaccount');
    }
    public get errBeneficiaryAccField() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_recipientaccount')]//ancestor::mat-form-field//mat-error`);
    }
    private get beneficiaryNameField() {
        return this.page.locator('input#beneficiary_beneficiaryname');
    }
    public get errBeneficiaryNameField() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_beneficiaryname')]//ancestor::mat-form-field//mat-error`);
    }
    private get beneficiaryAddrLine1Field() {
        return this.page.locator('input#beneficiary_beneficiaryAddress1');
    }
    public get errBeneficiaryAddrL1Field() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_beneficiaryAddress1')]//ancestor::mat-form-field//mat-error`);
    }
    private get beneficiaryAddrLine2Field() {
        return this.page.locator('input#beneficiary_beneficiaryAddress2');
    }
    public get errBeneficiaryAddrL2Field() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_beneficiaryAddress2')]//ancestor::mat-form-field//mat-error`);
    }
    private get beneficiaryBICField() {
        return this.page.locator('input#beneficiary_swiftCode');
    }
    public get errBeneficiaryBICField() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_swiftCode')]//ancestor::mat-form-field//mat-error`);
    }
    private get beneficiaryBankNameField() {
        return this.page.locator('input#beneficiary_bankName');
    }
    public get errBeneficiaryBankNameField() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_bankName')]//ancestor::mat-form-field//mat-error`);
    }
    private get beneficiaryBankAddrField() {
        return this.page.locator('input#beneficiary_branchAddress');
    }
    public get errBeneficiaryBankAddrField() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_branchAddress')]//ancestor::mat-form-field//mat-error`);
    }
    private get intermediaryBICField() {
        return this.page.locator('input#beneficiary_intermediaryBankBIC');
    }
    private get intermediaryBankNameField() {
        return this.page.locator('input#beneficiary_intermediaryBankName');
    }
    private get ddlChargeOptions() {
        return this.page.locator(`xpath=//mat-label[contains(text(),'Charge Option')]/../../mat-select`);
    }
    public get errChargeOptionField() {
        return this.page.locator(`xpath=//mat-label[contains(text(),'Charge Option')]/ancestor::mat-form-field//mat-error`);
    }
    private get remarksField() {
        return this.page.locator('#beneficiary_payment_detail');
    }
    public get errRemarksField() {
        return this.page.locator(`xpath=//input[contains(@id,'beneficiary_payment_detail')]//ancestor::mat-form-field//mat-error`);
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

    async fillForm(data: SwiftTransferFormData) {
        await waitForSpinnerToDisappear(this.page);
        const testDataUsed = `        
          - From Account:'${data.fromAccountNumber}'
          - Amount:'${data.remittanceAmount}'
          - Remarks:'${data.remarks}'`;
        await allure.attachment("Test Data", testDataUsed, "text/plain");
        if (data.fromAccountNumber.trim().length > 0) {
            await this.ddlFromAccount.click();
            await (this.page.locator("xpath=//div[@role='listbox'][contains(@class,'account-select')]")).waitFor({ state: 'visible', timeout: 10000 });;
            const optionToSelect = this.page.locator(`mat-option:has-text("${data.fromAccountNumber}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (data.currency.trim().length > 0) {
            await this.ddlCurrency.click();
            const optionToSelect = this.page.locator(`mat-option:has-text("${data.currency}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (data.remittanceAmount.trim().length > 0) {
            await this.amountField.clear();
            await this.amountField.fill(data.remittanceAmount);
        }
        if (data.beneficiaryCountry.trim().length > 0) {
            await this.ddlBeneficiaryCountry.click();
            const optionToSelect = this.page.locator(`mat-option:has-text("${data.beneficiaryCountry}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (data.beneficiaryAccountIban.trim().length > 0) {
            await this.beneficiaryAccIBANField.clear();
            await this.beneficiaryAccIBANField.fill(data.beneficiaryAccountIban);
        }
        if (data.beneficiaryName.trim().length > 0) {
            await this.beneficiaryNameField.clear();
            await this.beneficiaryNameField.fill(data.beneficiaryName);
        }
        if (data.beneficiaryAddress1.trim().length > 0) {
            await this.beneficiaryAddrLine1Field.clear();
            await this.beneficiaryAddrLine1Field.fill(data.beneficiaryAddress1);
        }
        if (data.beneficiaryAddress2.trim().length > 0) {
            await this.beneficiaryAddrLine2Field.clear();
            await this.beneficiaryAddrLine2Field.fill(data.beneficiaryAddress1);
        }
        if (data.beneficiaryBankBic.trim().length > 0) {
            await this.beneficiaryBICField.clear();
            await this.beneficiaryBICField.fill(data.beneficiaryBankBic);

            //click check code
            await this.page.locator('#beneficiary_swift_code_check').first().click();
            await waitForSpinnerToDisappear(this.page);

            //check autopopulated bank name and address 
            const actualBeneficiaryBankName= await this.utilityLibraryPage.GetTextFieldValue(this.page, this.beneficiaryBankNameField);
            const actualBeneficiaryBankAddrName= await this.utilityLibraryPage.GetTextFieldValue(this.page, this.beneficiaryBankAddrField);
            expect(actualBeneficiaryBankName).toContain(data.beneficiaryBankName);
            expect(actualBeneficiaryBankAddrName).toContain(data.beneficiaryBankAddress);
        }
        if (data.intermediaryBankBic) {
            await this.intermediaryBICField.clear();
            await this.intermediaryBICField.fill(data.intermediaryBankBic);
                        
            //click check code
            await this.page.locator('#beneficiary_swift_code_check').nth(1).click();
            await waitForSpinnerToDisappear(this.page);

            //check autopopulated bank name and address 
            const actualIntermediaryBankName= await this.utilityLibraryPage.GetTextFieldValue(this.page, this.intermediaryBankNameField);
            expect(actualIntermediaryBankName).toContain(data.intermediaryBankName);
        }
        if (data.chargeOption.trim().length > 0) {
            await this.ddlChargeOptions.click();
            const optionToSelect = this.page.locator(`mat-option:has-text("${data.chargeOption}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (data.remarks.trim().length > 0) {
            await this.remarksField.clear();
            await this.remarksField.fill(data.remarks);
        }
    }

    async submitAndConfirm(_formData: SwiftTransferFormData) {
        await this.page.locator('button#save_or_pay_beneficiary').click();
        await this.page.getByRole('button', { name: /^Confirm$/ }).click().catch(() => { });
        await waitForSpinnerToDisappear(this.page);
    }

    async confirmFromDialog() {
        await this.page.getByRole('button', { name: /^\s*Confirm\s*$/ }).click();
        await waitForSpinnerToDisappear(this.page);
    }

    async VerifyConfirmationDialog(data: SwiftTransferFormData) {
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
    async VerifySwiftSuccessDialog(data: SwiftTransferFormData) {

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
