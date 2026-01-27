// pageObject.ts
import { Page, Locator } from '@playwright/test';
import { ReceiptHelper } from '../Helpers/RecieptHandler';
import { expect } from '@playwright/test';
import * as allure from "allure-js-commons";
import { utilityLibrary } from '../Utils/utilityLibrary';



export class PayOwnCreditCardPage {
    private readonly page: Page;
    public readonly ddlFromAccount: Locator;
    private readonly ddlToAccount: Locator;
    private readonly transferAmountInput: Locator;
    private readonly remarksInput: Locator;
    public readonly nextButton: Locator;
    private readonly ConfirmationDetails: Locator;
    private readonly showAmountNextButton: Locator;
    private readonly exportReceiptButton: Locator;
    public readonly errorToAccount: Locator;
    public readonly errorAmount: Locator;
    public readonly errorRemarks: Locator;
    private readonly utilityLibraryPage: utilityLibrary;


    constructor(page: Page) {
        this.page = page;
        this.ddlFromAccount = page.locator(`xpath=//mat-label[contains(text(),'From Account')]/ancestor::label/following-sibling::mat-select`);
        this.ddlToAccount = page.locator(`xpath=//mat-label[contains(text(),'To Account')]/ancestor::label/following-sibling::mat-select`);
        this.transferAmountInput = page.locator('input#transaction_amount');
        this.remarksInput = page.locator('input#fundstransfer_srcnarrative');
        this.nextButton = page.locator("xpath=//button[@id='fundstransfer_next']//span[contains(text(),'Next')]");
        this.ConfirmationDetails = page.locator('//div[@class="confirmation-details"]');
        this.showAmountNextButton = page.locator('xpath=//*[@id="showamountselector_next"]');
        this.exportReceiptButton = page.locator('xpath=//*[@id="export_receipt"]');
        this.errorToAccount = page.locator(`xpath=//app-account-selection-dropdown[contains(@id,'destination_account')]//mat-error`);
        this.errorAmount = page.locator(`xpath=//input[contains(@id,'transaction_amount')]//ancestor::mat-form-field//mat-error`);
        this.errorRemarks = page.locator(`xpath=//input[contains(@id,'fundstransfer_srcnarrative')]//ancestor::mat-form-field//mat-error`);
        this.utilityLibraryPage = new utilityLibrary(page)
    }


    async fillCreditCardTransferForm(SenderAccount: string, CreditCard: string, TransferAmount: string, Remarks: string) {
        const testDataUsed = `        
              - From Account:'${SenderAccount}'
              - Credit Card Number:'${CreditCard}'
              - Amount:'${TransferAmount}'
              - Remarks:'${Remarks}'`;
        await allure.attachment("Test Data", testDataUsed, "text/plain");
        if (SenderAccount.trim().length > 0) {
            await this.ddlFromAccount.click();
            const optionToSelect = await this.page.locator(`mat-option:has-text("${SenderAccount}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (CreditCard.trim().length > 0) {
            await this.ddlToAccount.click();
            const optionToSelect = await this.page.locator(`mat-option:has-text("${CreditCard}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (TransferAmount.trim().length > 0) {
            await this.transferAmountInput.fill(TransferAmount);
        }
        if (Remarks.trim().length > 0) {
            await this.remarksInput.fill(Remarks);
        }
    }
    async clickNext(timeout = 10000): Promise<void> {
        await this.nextButton.waitFor({ state: 'visible', timeout });
        await this.nextButton.click();

    }

    async clickShowAmountNext(timeout = 15000): Promise<void> {
        await this.showAmountNextButton.waitFor({ state: 'visible', timeout });
        await this.showAmountNextButton.click();
    }

    async verifyPleaseConfirmDialogDetails(SenderAccount: string, SenderNickname: string, CreditCard: string, creditCardCNickname: string, TransferAmount: string, CreditCardCurrency: string, ExchangeRate: string, TransactionDate: string, Remarks: string, timeout = 10000) {
        if (SenderAccount.trim().length > 0) {
            const fromAccount = (await this.page.locator("xpath=//app-pay-own-credit-card-confirm-step//div[text()='From Account']/following-sibling::div[1]").innerText()).trim();
            const senderAccNickname = fromAccount.split("\n")[0].trim();
            const firstAccount = fromAccount.split("\n")[1].trim();
            await this.utilityLibraryPage.VerifyExpectedActual(SenderNickname, senderAccNickname);
            await this.utilityLibraryPage.VerifyExpectedActual(SenderAccount, firstAccount);

        }

        if (CreditCard.trim().length > 0) {
            const toAccount = await this.page.locator("xpath=//app-pay-own-credit-card-confirm-step//div[text()='To Account']/following-sibling::div[1]").innerText();
            const creditCardName = toAccount.split("\n")[0].trim();
            const creditCardNum = toAccount.split("\n")[1].trim();
            await this.utilityLibraryPage.VerifyExpectedActual(creditCardCNickname, creditCardName);
            await this.utilityLibraryPage.VerifyExpectedActual(CreditCard, creditCardNum);
        }
        if (TransferAmount.trim().length > 0) {
            var currencyShortForm = "";
            if (CreditCardCurrency === "EUR") {
                currencyShortForm = "€";
            }
            else {
                currencyShortForm = CreditCardCurrency;
            }
            const transferAmount = await this.page.locator(`xpath=//app-pay-own-credit-card-confirm-step//app-amount[contains(text(),'${currencyShortForm}') and contains(text(),'${TransferAmount}')]`);
            this.utilityLibraryPage.isElementVisible(transferAmount, "Amount", currencyShortForm + " " + TransferAmount);
        }
        if (Remarks.trim().length > 0) {
            const remarks = await this.page.locator(`xpath=//app-pay-own-credit-card-confirm-step//div[text()='Remarks']/following-sibling::div[1][contains(text(),'${Remarks}')]`);
            this.utilityLibraryPage.isElementVisible(remarks, "Remarks", Remarks);
        }
    }

    async verifySuccessfulDialogDetails(SenderAccount: string, SenderCurrency: string, CreditCard: string, CreditCardCurrency: string, TransferAmount: string, TransactionDate: string, Remarks: string, timeout = 10000): Promise<string> {
        await expect(this.page.locator(`xpath=//app-pay-own-credit-card-done-step//mat-icon[contains(text(),'check')]`)).toBeVisible({ timeout });
        await expect(this.page.locator(`xpath=//app-pay-own-credit-card-done-step//p[contains(text(),'Transfer successful')]`)).toBeVisible({ timeout });
        if (TransactionDate.trim().length > 0) {
            const paymentDate = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='Transaction Date']/following-sibling::div[contains(text(),'${TransactionDate}')]`);
            this.utilityLibraryPage.isElementVisible(paymentDate, "Transaction Date", TransactionDate);
            //const paymentDate = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='Transaction Date']/following-sibling::div[1]//div[contains(@class,'mat-body')]`).innerText();
            //await this.utilityLibraryPage.VerifyExpectedActual(TransactionDate, paymentDate);
            }

        if (SenderAccount.trim().length > 0) {
            const fromAccount = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='From Account']/following-sibling::div[1]//div[contains(text(),'${SenderAccount}')]`);
            this.utilityLibraryPage.isElementVisible(fromAccount, "From Account", SenderAccount);
            //const fromAccount = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='From Account']/following-sibling::div[1]//div[contains(@class,'mat-body')]`).innerText();
            //await this.utilityLibraryPage.VerifyExpectedActual(SenderAccount, fromAccount);
        }

        if (CreditCard.trim().length > 0) {
            //const creditCardNum = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='To Account']/following-sibling::div[1]//div[contains(text(),'${CreditCard}')]`);
            //this.utilityLibraryPage.isElementVisible(creditCardNum, "To Account", CreditCard);        
            // const creditCardNum = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='To Account']/following-sibling::div[1]//div[contains(@class,'mat-body')]`).innerText();
            // await this.utilityLibraryPage.VerifyExpectedActual(CreditCard, creditCardNum);
        }

        if (CreditCardCurrency.trim().length > 0) {
            const creditCardCurrency = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='Currency']/following-sibling::div[1]//div[contains(text(),'${CreditCardCurrency}')]`);
            this.utilityLibraryPage.isElementVisible(creditCardCurrency, "Currency", CreditCardCurrency);
        }
        if (TransferAmount.trim().length > 0) {
            var currencyShortForm = "";
            if (CreditCardCurrency === "EUR") {
                currencyShortForm = "€";
            }
            const transferAmount = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//app-amount[contains(text(),'${currencyShortForm}') and contains(text(),'${TransferAmount}')]`);
            this.utilityLibraryPage.isElementVisible(transferAmount, "Amount", currencyShortForm + " " + TransferAmount);
        }

        if (Remarks.trim().length > 0) {
            const remarks = await this.page.locator(`xpath=//app-pay-own-credit-card-done-step//div[text()='Remarks']/following-sibling::div[1]//div[contains(text(),'${Remarks}')]`);
            this.utilityLibraryPage.isElementVisible(remarks, "Remarks", Remarks);
        }
        await expect(this.page.locator(`xpath=//app-pay-own-credit-card-done-step//p[contains(text(),'Funds will be available on your credit card within the next 2 hours following repayment, or on the next day at latest.')]`)).toBeVisible({ timeout });

        const referenceLocator = await this.page.locator(`xpath=//div[contains(text(),'eBanking Reference')]/following-sibling::div/div/div`);
        const referenceIDEle = await referenceLocator.innerText();

        await expect(this.page.locator(`xpath=//button[contains(@id,'export_receipt')]`)).toBeEnabled({ timeout });
        await expect(this.page.locator(`xpath=//button[contains(@id,'transactionresult_OK')]`)).toBeEnabled({ timeout });
        return referenceIDEle;
    }

    async verifyReceiptData(
        senderAccount: string,
        toAccount: string,
        paymentDate: string,
        amount: string,
        currency: string,
        remarks: string,
        refId: string
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
        expectDetail("Transaction Type : Pay Own Credit Card");
        expectDetail("Remarks : " + remarks);

    }

}