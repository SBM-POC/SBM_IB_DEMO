import { Page, expect, Locator } from '@playwright/test';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";
import { ReceiptHelper } from '../Helpers/RecieptHandler';


export class OtherLocalBankPage {
    private readonly page: Page;

    // Top nav
    private readonly payAndTransferTab: Locator;
    private readonly otherLocalBankLink: Locator;

    // Beneficiaries landing
    private readonly payOnceBtn: Locator;

    // Form (Normal / MACSS / Instant)
    public readonly fromAccountCombo: Locator;
    private readonly normalRadio: Locator;

    private readonly recipientAccInput: Locator;
    private readonly amountInput: Locator;
    private readonly beneficiaryNameInput: Locator;
    private readonly remarksInput: Locator;
    private readonly beneficiaryBankCombo: Locator;

    // Mode radios (native input ids from your HTML)
    private readonly macssRadioNative: Locator;
    private readonly instantRadioNative: Locator;

    // When MACSS/Instant prompts: choose “Account No.” (avoid IBAN)
    private readonly accountNumberRadioNative: Locator;

    // Actions
    private readonly payBtn: Locator;

    public readonly errorToAccount: Locator;
    public readonly errorAmount: Locator;
    public readonly errorBeneficiaryName: Locator;
    public readonly errorRemarks: Locator;
    public readonly errorBeneficiaryBank: Locator;


    private readonly utilityLibraryPage: utilityLibrary;
    private calendarButton: Locator;



    constructor(page: Page) {
        this.page = page;

        this.payAndTransferTab = page.locator('#TRANSACTIONS_hor a', { hasText: 'Pay & Transfer' });
        this.otherLocalBankLink = page.getByRole('link', { name: 'Other Local Bank Transfer' });

        this.payOnceBtn = page.getByRole('button', { name: /^Pay Beneficiary Once$/ });

        this.fromAccountCombo = page.getByRole('combobox', { name: /From Account/i });
        this.recipientAccInput = page.locator('#beneficiary_recipientaccount');
        this.amountInput = page.locator('#transaction_amount');
        this.beneficiaryNameInput = page.locator('#beneficiary_beneficiaryname');
        this.remarksInput = page.locator('#beneficiary_payment_detail');
        this.beneficiaryBankCombo = page.getByRole('combobox', { name: /Beneficiary Bank/i });
        this.calendarButton = page.locator(`xpath=//button//mat-icon[contains(@id,'datepicker-icon')]`);

        // native radios (exact ids you provided)
        this.normalRadio = page.locator('mat-radio-button input#beneficiary_EFT-input');
        this.macssRadioNative = page.locator('mat-radio-button input#beneficiary_MACSS-input');
        this.instantRadioNative = page.locator('mat-radio-button input#beneficiary_IPS-input');        
        
        // Account No. radio (to avoid IBAN)
        this.accountNumberRadioNative = page.locator('#beneficiary_acc_no-input');
        this.payBtn = page.getByRole('button', { name: /^Pay$/ });
        this.utilityLibraryPage = new utilityLibrary(page)
        this.errorAmount = page.locator(`xpath=//input[contains(@id,'transaction_amount')]//ancestor::mat-form-field//mat-error`);
        this.errorToAccount = page.locator(`xpath=//input[contains(@id,'beneficiary_recipientaccount')]//ancestor::mat-form-field//mat-error`);
        this.errorBeneficiaryName = page.locator(`xpath=//input[contains(@id,'beneficiary_beneficiaryname')]//ancestor::mat-form-field//mat-error`);
        this.errorRemarks = page.locator(`xpath=//input[contains(@id,'beneficiary_payment_detail')]//ancestor::mat-form-field//mat-error`);
        this.errorBeneficiaryBank = page.locator(`xpath=//mat-select[contains(@id,'beneficiary_select_bank')]//ancestor::mat-form-field//mat-error`);
}



    async startPayOnce() {
        await this.payOnceBtn.click();
        await expect(this.page.locator("xpath=//app-alert-popup//mat-icon[@data-mat-icon-name='success']")).toBeVisible({ timeout: 15000 });
        await expect(this.page.locator("xpath=//app-alert-popup//p[contains(text(),'Charges Free')]")).toBeVisible({ timeout: 15000 });
        await expect(this.page.locator("xpath=//app-alert-popup//p[contains(text(),'Cut off time until : 15:00 hrs')]")).toBeVisible({ timeout: 15000 });
         await this.page.locator(`xpath=//mat-radio-button[@id='beneficiary_EFT'][contains(@class,'checked')]`).waitFor({ state: 'visible',  timeout: 15000 });              
        
        await this.page.locator("xpath=//app-alert-popup//button").click();

        await expect(this.fromAccountCombo).toBeVisible({ timeout: 15000 });
    }
    async selectTransactionMode(type: string) {
        switch (type) {
            case "normal":
                await this.normalRadio.click();
                await this.page.locator(`xpath=//mat-radio-button[@id='beneficiary_EFT'][contains(@class,'checked')]`).waitFor({ state: 'visible', timeout: 15000 });
                break;
            case "macss":
                this.macssRadioNative.click();
                await expect(this.page.locator("xpath=//app-alert-popup//p[contains(text(),'Charges Rs 75')]")).toBeVisible({ timeout: 15000 });
                await expect(this.page.locator("xpath=//app-alert-popup//p[contains(text(),'Cut off time until : 15:00 hrs')]")).toBeVisible({ timeout: 15000 });
                await this.page.locator(`xpath=//mat-radio-button[@id='beneficiary_MACSS'][contains(@class,'checked')]`).waitFor({ state: 'visible', timeout: 15000 });
                await this.page.locator("xpath=//app-alert-popup//button").click();
                break;
            case "instant":
                this.instantRadioNative.click();
                await expect(this.page.locator("xpath=//app-alert-popup//p[contains(text(),'Charges Rs 75')]")).toBeVisible({ timeout: 15000 });
                await expect(this.page.locator("xpath=//app-alert-popup//p[contains(text(),'Cut off time until : 15:00 hrs')]")).toBeVisible({ timeout: 15000 });
                await this.page.locator(`xpath=//mat-radio-button[@id='beneficiary_IPS'][contains(@class,'checked')]`).waitFor({ state: 'visible', timeout: 15000 });
                await this.page.locator("xpath=//app-alert-popup//button").click();
                break;
        }
    }
    // ---------- Form fill ----------
    async fillTransferForm(fromAccount:string, transactionType:string, toAccount:string, amount:string, beneficiaryName:string, transationDate:string, remarks:string, beneficiaryBank:string,timeout=10000) {

        if (fromAccount.trim().length > 0) {
            await this.fromAccountCombo.click()
            const optionToSelect = this.page.locator(`mat-option:has-text("${fromAccount}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }

        if (transactionType.trim().length > 0) {
            await this.selectTransactionMode(transactionType);
        }

        if (toAccount.trim().length > 0) {
            await this.recipientAccInput.clear();
            await this.recipientAccInput.fill(toAccount);
        }

        if (amount.trim().length > 0) {
            await this.amountInput.clear();
            await this.amountInput.fill(amount);
        }
        if (beneficiaryName.trim().length > 0) {
            await this.beneficiaryNameInput.clear();
            await this.beneficiaryNameInput.fill(beneficiaryName);
        }

        if (remarks.trim().length > 0) {
            await this.remarksInput.clear();
            await this.remarksInput.fill(remarks);
        }
        if (transationDate.trim().length > 0) {
            const dateToSelect = await this.utilityLibraryPage.CalculateDateDDMMYYYY(transationDate);
            await this.utilityLibraryPage.SelectDateInCalendar(this.calendarButton,dateToSelect);
        }
        if (beneficiaryBank.trim().length > 0) {
            await this.beneficiaryBankCombo.click()
            const optionToSelect = this.page.locator(`mat-option:has-text("${beneficiaryBank}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
    }
    async verifyPleaseConfirmDialogDetails(senderAccount: string, senderNickname: string, recipientName: string, recipientAccount: string,beneficiaryCode:string ,transferAmount: string, currency: string, transactionDate: string, remarks: string, timeout = 10000) {
        if (senderAccount.trim().length > 0) {
            const fromAccount = (await this.page.locator("xpath=//app-transaction-confirmation//div[contains (text(),'From')]/following-sibling::div[1]").innerText()).trim();
            const senderAccNickname = fromAccount.split("\n")[0].trim();
            const firstAccount = fromAccount.split("\n")[1].trim();
            await this.utilityLibraryPage.VerifyExpectedActual(senderNickname, senderAccNickname);
            await this.utilityLibraryPage.VerifyExpectedActual(senderAccount, firstAccount);

        }

        if (recipientAccount.trim().length > 0) {
            const toAccount = await this.page.locator("xpath=//app-transaction-confirmation//div[contains (text(),'To')]/following-sibling::div[1]").innerText();
            const toAccountName = toAccount.split("\n")[0].trim();
            const toAccountNum = toAccount.split("\n")[1].trim();
            const toAccountCode = toAccount.split("\n")[2].trim();

            await this.utilityLibraryPage.VerifyExpectedActual(recipientName, toAccountName);
            await this.utilityLibraryPage.VerifyExpectedActual(recipientAccount, toAccountNum);
            await this.utilityLibraryPage.VerifyExpectedActual(beneficiaryCode, toAccountCode);
 
        }
        if (transferAmount.trim().length > 0) {
            var currencyShortForm = "";
            if (currency === "EUR") {
                currencyShortForm = "€";
            }
            else {
                currencyShortForm = currency;
            }
            const transferAmountFld = await this.page.locator(`xpath=//app-transaction-confirmation//div[contains (text(),'Amount')]/following-sibling::div/div[contains(@class,'amount')][contains(text(),'${currencyShortForm}') and contains(text(),'${transferAmount}')]`);
            this.utilityLibraryPage.isElementVisible(transferAmountFld, "Amount", currencyShortForm + " " + transferAmount);
        }
        if (transactionDate.trim().length > 0) {
            const transactionDateFld = await this.page.locator(`xpath=//app-transaction-confirmation//div[contains (text(),'Payment Date')]/following-sibling::div[1][contains(text(),'${transactionDate}')]`);
            this.utilityLibraryPage.isElementVisible(transactionDateFld, "Payment Date", transactionDate);
        }
        if (remarks.trim().length > 0) {
            const remarksFld = await this.page.locator(`xpath=//app-transaction-confirmation//div[contains (text(),'Remarks')]/following-sibling::div[1][contains(text(),'${remarks}')]`);
            this.utilityLibraryPage.isElementVisible(remarksFld, "Remarks", remarks);
        }
        await expect(this.page.locator("xpath=//app-transaction-confirmation//p[contains(text(),'Kindly ensure that:')]")).toBeVisible({ timeout: 15000 });
        await expect(this.page.locator("xpath=//app-transaction-confirmation//p[contains(text(),'1.There is sufficient balance in your debiting account on the processing date.')]")).toBeVisible({ timeout: 15000 });
        await expect(this.page.locator("xpath=//app-transaction-confirmation//p[contains(text(),'2.The transaction amount is within your daily transaction limit.')]")).toBeVisible({ timeout: 15000 });
    }

    async VerifySuccessfulDialogDetails(TransactionDate:string,SenderAccount: string, RecipientAccount: string, TransferAmount: string, Currency: string, Remarks: string, timeout = 20000){
    //await waitForSpinnerToDisappear(this.page);              
    await expect(this.page.locator(`xpath=//app-transaction-confirmation-result//div[contains(@class,'success')]`)).toBeVisible({ timeout });
    await expect(this.page.locator(`xpath=//app-transaction-confirmation-result//p[contains(text(),'Transfer successful')]`)).toBeVisible({ timeout });
    if (TransactionDate.trim().length > 0) {
      const fromAccount = await this.page.locator(`xpath=//app-transaction-done-details//div[text()='Date']/following-sibling::div[1]//div[contains(text(),'${TransactionDate}')]`);
      this.utilityLibraryPage.isElementVisible(fromAccount, "Date", TransactionDate);
    }
    if (SenderAccount.trim().length > 0) {
      const fromAccount = await this.page.locator(`xpath=//app-transaction-done-details//div[text()='From']/following-sibling::div[1]//div[contains(text(),'${SenderAccount}')]`);
      this.utilityLibraryPage.isElementVisible(fromAccount, "From Account", SenderAccount);
    }
    if (RecipientAccount.trim().length > 0) {
      const toAccount = await this.page.locator(`xpath=//app-transaction-done-details//div[text()='To']/following-sibling::div[1]//div[contains(text(),'${RecipientAccount}')]`);
      this.utilityLibraryPage.isElementVisible(toAccount, "To Account", RecipientAccount);
    }

    if (TransferAmount.trim().length > 0) {
      var currencyShortForm = "";
      if (Currency === "EUR") {
        currencyShortForm = "€";
      }
      else {
        currencyShortForm = Currency;
      }
      const transferAmount = await this.page.locator(`xpath=//app-transaction-done-details//app-amount[contains(text(),'${currencyShortForm}') and contains(text(),'${TransferAmount}')]`);
      this.utilityLibraryPage.isElementVisible(transferAmount, "Amount", currencyShortForm + " " + TransferAmount);
    }
    if (Currency.trim().length > 0) {
      const creditCardCurrency = await this.page.locator(`xpath=//app-transaction-done-details//div[text()='Currency']/following-sibling::div[1]//div[contains(text(),'${Currency}')]`);
      this.utilityLibraryPage.isElementVisible(creditCardCurrency, "Currency", Currency);
    }

    if (Remarks.trim().length > 0) {
      const remarks = await this.page.locator(`xpath=//app-transaction-done-details//div[text()='Remarks']/following-sibling::div[1]//div[contains(text(),'${Remarks}')]`);
      this.utilityLibraryPage.isElementVisible(remarks, "Remarks", Remarks);
    }

    const referenceLocator = await this.page.locator(`xpath=//div[contains(text(),'eBanking Reference')]/following-sibling::div/div/div`);
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
            expectDetail("Transaction Type : Other Local Bank Transfer");
            expectDetail("Remarks : " + remarks);
    
            if (valueDate.trim().length > 0)
            {        
                expectDetail("Value Date : " + valueDate);
    
            }
    
        }
}
