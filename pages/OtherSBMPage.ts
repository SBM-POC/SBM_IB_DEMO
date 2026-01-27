// pageObject.ts
import { Page, Locator, expect } from '@playwright/test';
import { ReceiptHelper } from '../Helpers/RecieptHandler';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";

export class OtherSBMPage {
    private readonly page: Page;
    public readonly errorFromAccount: Locator;
    public readonly errorToAccount: Locator;
    public readonly errorAmount: Locator;
    public readonly errorRemarks: Locator;
    public readonly ddlFromAccount: Locator;
    public readonly btnPayBeneficiaryOnce: Locator;
    public readonly btnPay: Locator;
    public readonly btnConfirmPay: Locator;

    constructor(page: Page) {
        this.page = page;

        // Keep your original locators exactly as they were
        this.errorFromAccount = page.locator(`xpath=//app-account-selection-dropdown[contains(@id,'benefifiary_source_account')]//mat-error`);
        this.errorAmount = page.locator(`xpath=//input[contains(@id,'transaction_amount')]//ancestor::mat-form-field//mat-error`);
        this.errorToAccount = page.locator(`xpath=//input[contains(@id,'beneficiary_recipientaccount')]//ancestor::mat-form-field//mat-error`);
        this.errorRemarks = page.locator(`xpath=//input[contains(@id,'beneficiary_payment_detail')]//ancestor::mat-form-field//mat-error`);
        this.ddlFromAccount = page.locator(`xpath=//mat-label[contains(text(),'From Account')]/../../mat-select`);
        this.btnPayBeneficiaryOnce = page.locator(`xpath=//button[contains(@id,'ben_pay_once')]//span[@class='mdc-button__label']`);
        this.btnPay = page.locator(`xpath=//button[contains(@id,'save_or_pay_beneficiary')]//span[@class='mdc-button__label']`);
        this.btnConfirmPay = page.locator(`xpath=//button[contains(@id,'BW_button_021029')]//span[@class='mdc-button__label']`);

    }

    async verifyReceiptData(
        senderAccount: string,
        toAccount: string,
        paymentDate: string,
        amount: string,
        currency: string,
        remarks: string,
        refId: string,
        valueDate:string
    ) {
        const receiptHelper = new ReceiptHelper(this.page);

        // Step 1: Download the receipt
        const pdfPath = await receiptHelper.DownloadReceipt();
        // Step 2: Extract PDF text
        const pdfLines = await receiptHelper.readPdfData(pdfPath);
        // Step 3: Perform validation
        const content = pdfLines.join(" ");
        console.log(content);
        // Helper
        const expectDetail = async (labelValue: string) => {
            try {
                expect(content).toContain(labelValue);
                allure.attachment(`The receipt contains '${labelValue.trim()}'`, "", { contentType: "text/plain" });
            }
            catch (error) {
                const failMessage = `The receipt does not contain '${labelValue.trim()}'`;
                allure.attachment(failMessage, "", "text/plain");
                throw new Error(failMessage);
            }
        };

        expectDetail("Remittance Advice");
        expectDetail("Transaction Successful");
        expectDetail("Date : " + paymentDate);
        expectDetail("Transaction Currency : " + currency);
        expectDetail("Transaction amount : " + currency + " " + amount);
        expectDetail("From : " + senderAccount);
        expectDetail("To : " + toAccount);
        expectDetail("eBanking Reference : " + refId);
        expectDetail("Transaction Type : Other SBM Transfer");
        expectDetail("Remarks : " + remarks);

        if (valueDate.trim().length > 0)
        {        
            expectDetail("Value Date : " + valueDate);

        }

    }
}