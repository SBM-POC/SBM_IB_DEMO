import { Locator, Page } from '@playwright/test';
import { ReceiptHelper } from '../Helpers/RecieptHandler';
import { expect } from '@playwright/test';
import * as allure from "allure-js-commons";
import { utilityLibrary } from '../Utils/utilityLibrary';


export class OwnBankTransferPage {
    private readonly page: Page;
    private readonly utilityLibraryPage: utilityLibrary;
    private calendarButton: Locator;


    constructor(page: Page) {

        this.page = page;
        this.utilityLibraryPage = new utilityLibrary(page)
        this.utilityLibraryPage = new utilityLibrary(page)
        this.calendarButton = page.locator(`xpath=//button//mat-icon[contains(@id,'datepicker-icon')]`);
    }

    public readonly fromAccountDropdown =
        'xpath=//mat-label[normalize-space(.)="From Account"]/ancestor::div[contains(@class,"mat-mdc-form-field-infix")]//mat-select[1]';
    private readonly toAccountDropdown =
        'xpath=//mat-label[normalize-space(.)="To Account"]/ancestor::div[contains(@class,"mat-mdc-form-field-infix")]//mat-select[1]';
    private readonly currencyDropdown =
        'xpath=//mat-label[normalize-space(.)="Currency"]/ancestor::div[contains(@class,"mat-mdc-form-field-infix")]//mat-select[1]';

    private readonly amountInput =
        'xpath=//mat-label[normalize-space(.)="Amount"]/ancestor::div[contains(@class,"mat-mdc-form-field-infix")]//input[1]';
    private readonly remarksInput =
        'xpath=//mat-label[normalize-space(.)="Remarks"]/ancestor::div[contains(@class,"mat-mdc-form-field-infix")]//input[1]';

    private readonly transferButton = 'xpath=//button[@id="fundstransfer_next"]';
    private readonly confirmButton =
        'xpath=//button[@id="showamountselector_next" or .//span[normalize-space(.)="Confirm"]]';

    private readonly recurringToggle = 'xpath=//button[@id="BW_slide_recurring-button" and @role="switch"]';
    private readonly frequencyDropdown = 'xpath=//mat-select[@id="payment_frequency"]';

    // Locations where the app shows field-level (inline) error messages.
    private readonly toAccountError =
        'xpath=//mat-label[normalize-space(.)="To Account"]/following::mat-error[1]';

    private readonly amountError =
        'xpath=//mat-label[normalize-space(.)="Amount"]/following::mat-error[1]';

    private readonly remarksError =
        'xpath=//mat-label[normalize-space(.)="Remarks"]/following::mat-error[1]';

    private readonly frequencyError =
        'xpath=//mat-label[normalize-space(.)="Frequency"]/following::mat-error[1]';


    // Panels (sections) that appear after clicking "Transfer" (confirm screen) and after "Confirm" (success screen).
    private readonly confirmPanel = 'xpath=//app-funds-transfer-confirm-step';
    private readonly donePanel = 'xpath=//app-funds-transfer-done-step';

    /**
     * Opens a dropdown and selects an option by its visible text.
     * This mimics exactly what a person does when choosing from a menu.
     */
    private async chooseDropdownOption(triggerSelector: string, optionText: string): Promise<void> {
        const trigger = this.page.locator(triggerSelector).first();
        await trigger.click();
        const panel = this.page.locator('.cdk-overlay-container .mat-mdc-select-panel').first();
        await panel
            .locator('.mat-mdc-option .mdc-list-item__primary-text')
            .getByText(optionText, { exact: false })
            .first()
            .click();
    }


    async selectFromAccount(accountName: string) {
        await this.chooseDropdownOption(this.fromAccountDropdown, accountName);
    }

    async selectToAccount(accountName: string) {
        await this.chooseDropdownOption(this.toAccountDropdown, accountName);
    }


    async selectCurrency(currencyCode: string) {
        await this.chooseDropdownOption(this.currencyDropdown, currencyCode);
    }

    async enterAmount(amountValue: string) {
        await this.utilityLibraryPage.inputText(this.page, this.amountInput, amountValue);
    }


    async enterRemarks(remarksText: string) {
        await this.utilityLibraryPage.inputText(this.page, this.remarksInput, remarksText);
    }

    async selectDate(transactionDate: string) {
        const dateToSelect = await this.utilityLibraryPage.CalculateDateDDMMYYYY(transactionDate);
        await this.utilityLibraryPage.SelectDateInCalendar(this.calendarButton,dateToSelect);
    }

    /**
     * Turn on "Recurring"
     */
    async enableRecurring() {
        const toggleRecurring = this.page.locator(this.recurringToggle).first();
        const overlay = this.page.locator('.mat-mdc-select-panel,.cdk-overlay-pane').first();

        // If a dropdown overlay is open, press Escape to close it (so the toggle is clickable).
        if (await overlay.isVisible().catch(() => false)) {
            await this.page.keyboard.press('Escape');
        }

        await toggleRecurring.scrollIntoViewIfNeeded();

        // If it’s already on, do nothing.
        if ((await toggleRecurring.getAttribute('aria-checked')) === 'true') return;

        // Try up to 3 times in case of transient UI interference.
        for (let i = 0; i < 3; i++) {
            try {
                await this.utilityLibraryPage.clickButton(this.page, this.recurringToggle);
            } catch {
                await toggleRecurring.click({ force: true });
            }
            if ((await toggleRecurring.getAttribute('aria-checked')) === 'true') break;
        }
    }

    //Choose how often the recurring payment happens (Daily, Weekly, etc.). 
    async selectFrequency(frequencyValue: string) {
        await this.utilityLibraryPage.selectDropdown(this.page, this.frequencyDropdown, frequencyValue);
    }

    /**
     * Click the “Transfer” button to move from the edit form to the confirmation screen.
     * Then wait until the Confirm button is visible to ensure the page has loaded.
     */
    async clickTransfer() {
        const transferBtn = this.page.locator(this.transferButton);
        await transferBtn.waitFor({ state: 'visible' });
        await transferBtn.scrollIntoViewIfNeeded();
        await transferBtn.click({ force: true });
        await this.page.locator(this.confirmButton).waitFor({ state: 'visible' });
    }

    async clickConfirm() {
        await this.utilityLibraryPage.clickButton(this.page, this.confirmButton);
    }

    /**
     * Click “Transfer” but do not wait for the confirmation screen.
     * Negative tests use this because the app is expected to show errors instead of moving forward.
     */
    async clickTransferNoConfirmWait() {
        const transferBtn = this.page.locator(this.transferButton);
        await transferBtn.waitFor({ state: 'visible' });
        await transferBtn.scrollIntoViewIfNeeded();
        await transferBtn.click({ force: true });
    }



    /** Check any inline (under-the-field) error by its exact text. */
    async expectInlineError(expectedText: string) {
        await this.utilityLibraryPage.VerifyInlineErrorMessage(
            this.page,
            `xpath=//mat-error[normalize-space(.)=${JSON.stringify(expectedText)}]`,
            expectedText
        );
    }

    async expectToAccountError(expectedText: string) {
        await this.utilityLibraryPage.VerifyInlineErrorMessage(this.page, this.toAccountError, expectedText);
    }

    async expectAmountError(expectedText: string) {
        await this.utilityLibraryPage.VerifyInlineErrorMessage(this.page, this.amountError, expectedText);
    }


    async expectRemarksError(expectedText: string) {
        await this.utilityLibraryPage.VerifyInlineErrorMessage(this.page, this.remarksError, expectedText);
    }


    async expectFrequencyError(expectedText: string) {
        await this.utilityLibraryPage.VerifyInlineErrorMessage(this.page, this.frequencyError, expectedText);
    }


    async expectPopupError(expectedText: string) {
        await this.utilityLibraryPage.VerifyPopupErrorMessage(this.page, expectedText);
    }


    async expectConfirmFromAccountContains(accountNumber: string) {
        if (accountNumber) await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.confirmPanel, accountNumber);
    }


    async expectConfirmToAccountContains(accountNumber: string) {
        if (accountNumber) await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.confirmPanel, accountNumber);
    }


    async expectConfirmAmountNumeric(amountValue: string) {
        await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.confirmPanel, amountValue.replace(/[^\d.]/g, ''));
    }


    async expectConfirmRemarksEquals(remarksText: string) {
        if (remarksText) await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.confirmPanel, remarksText);
    }

    /** The confirmation page should state whether the transfer is recurring (Yes/No). */
    async expectConfirmRecurring(recurringStatus: 'Yes' | 'No') {
        await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.confirmPanel, recurringStatus);
    }



    /** The success page should show the same amount (digits only). */
    async expectSuccessAmountNumeric(amountValue: string) {
        await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.donePanel, amountValue.replace(/[^\d.]/g, ''));
    }


    async expectSuccessCurrencyEquals(currencyCode: string) {
        if (currencyCode) await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.donePanel, currencyCode);
    }

    async expectSuccessToAccountContains(accountNumber: string) {
        if (accountNumber) await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.donePanel, accountNumber);
    }


    async expectSuccessRemarksEquals(remarksText: string) {
        if (remarksText) await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.donePanel, remarksText);
    }

    /** The success page should state whether the transfer is recurring (Yes/No). */
    async expectSuccessRecurring(recurringStatus: 'Yes' | 'No') {
        await this.utilityLibraryPage.VerifyDomSuccesfulMessage(this.page, this.donePanel, recurringStatus);
    }
    async getReferenceID(timeout = 20000) : Promise <string> {
        const referenceLocator = this.page.locator(`xpath=//div[contains(text(),'eBanking Reference')]/following-sibling::div/div/div`);
        const referenceIDEle = await referenceLocator.innerText();

        await expect(this.page.locator(`xpath=//button[contains(@id,'export_receipt')]`)).toBeEnabled({ timeout });
        await expect(this.page.locator(`xpath=//button[contains(@id,'BW_button_733369')]`)).toBeEnabled({ timeout });
        return referenceIDEle;
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
        expectDetail("Transaction Type : Own Account Transfer");
        expectDetail("Remarks : " + remarks);
        if (valueDate.trim().length > 0)
        {        
            expectDetail("Value Date : " + valueDate);

        }

    }
}




