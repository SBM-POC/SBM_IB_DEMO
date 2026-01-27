import { expect, Page, Locator } from '@playwright/test';
import { TransferFormData } from '../Utils/Types';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import { utilityLibrary } from '../Utils/utilityLibrary';


export class ConfirmationDialogVerifier {
  private dialog: Locator;
  private values: Locator;
  private readonly page: Page;
  private readonly utilityLibraryPage: utilityLibrary;
  constructor(page: Page) {
    this.page = page;
    this.utilityLibraryPage = new utilityLibrary(page)
    this.dialog = page.locator('mat-dialog-container:has(div.mat-body-strong)');
    this.values = this.dialog.locator('div.mat-body-strong');
  }

  async verifyPleaseConfirmDialogDetails(data: TransferFormData & { currency: string }): Promise<void> {
    //await waitForSpinnerToDisappear(this.page);
    await expect(this.dialog).toBeVisible({ timeout: 10000 });

    await expect(this.values.nth(0)).toHaveText(data.senderNickname);
    await expect(this.values.nth(1)).toHaveText(data.senderAccount);
    await expect(this.values.nth(2)).toHaveText(data.toAccount);

    // Format amount with dynamic currency
    const formattedAmountCurrency = `${data.currency} ${parseFloat(data.amount).toLocaleString('en-MU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    await expect(this.values.nth(3)).toHaveText(formattedAmountCurrency);

    const selectedDate = await this.page.locator('#beneficiary_date-datepicker').inputValue();
    await expect(this.values.nth(4)).toHaveText(selectedDate.trim());
    await expect(this.values.nth(5)).toHaveText(data.remarks);
  }

  async verifyPleaseConfirmDialogDetailsNew(SenderNickname: string, SenderAccount: string, RecipientAccount: string, Currency: string, TransferAmount: string, PaymentDate: string, Remarks: string, timeout = 10000) {
    if (SenderNickname.trim().length > 0) {
      const senderNicknameEle = await this.page.locator(`xpath=//app-transaction-confirmation-details//div[contains(text(),'From')]/following-sibling::div[1]//div[contains(text(),'${SenderNickname}')]`);
      this.utilityLibraryPage.isElementVisible(senderNicknameEle, "Sender Nickname", SenderNickname);
    }
    if (SenderAccount.trim().length > 0) {
      const fromAccount = await this.page.locator(`xpath=//app-transaction-confirmation-details//div[contains(text(),'From')]/following-sibling::div[1]//div[contains(text(),'${SenderAccount}')][@data-test-name='sourceNumber']`);
      this.utilityLibraryPage.isElementVisible(fromAccount, "Sender Account", SenderAccount);
    }

    if (RecipientAccount.trim().length > 0) {
      const toAccount = await this.page.locator(`xpath=//app-transaction-confirmation-details//div[contains(text(),'To')]/following-sibling::div[1]//div[contains(text(),'${RecipientAccount}')]`);
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
      const transferAmount = this.page.locator(`xpath=//app-transaction-confirmation-details//div[contains(text(),'Amount')]/following-sibling::div[1]//div[contains(text(),'${currencyShortForm}') and contains(text(),'${TransferAmount}')]`);
      this.utilityLibraryPage.isElementVisible(transferAmount, "Amount", currencyShortForm + " " + TransferAmount);
    }
    // if (PaymentDate.trim().length > 0) {

    //   const paymentDateEle = this.page.locator(`xpath=//app-transaction-confirmation-details//div[contains(text(),'Payment')]/following-sibling::div[1]//div[contains(text(),'${PaymentDate}')]`);
    //   this.utilityLibraryPage.isElementVisible(paymentDateEle, "Payment Date", PaymentDate);

    // }
    if (Remarks.trim().length > 0) {
      const remarks = this.page.locator(`xpath=//app-transaction-confirmation-details//div[contains(text(),'Remarks')]/following-sibling::div[1]/div[contains(text(),'${Remarks}')]`);
      this.utilityLibraryPage.isElementVisible(remarks, "Remarks", Remarks);
    }
  }

  async verifySuccessfulDialogDetails(SenderAccount: string, RecipientAccount: string, TransferAmount: string, Currency: string, Remarks: string, timeout = 20000): Promise<string> {
    //await waitForSpinnerToDisappear(this.page);              
    await expect(this.page.locator(`xpath=//app-transaction-confirmation-result//div[contains(@class,'success')]`)).toBeVisible({ timeout });
    await expect(this.page.locator(`xpath=//app-transaction-confirmation-result//p[contains(text(),'Transfer successful')]`)).toBeVisible({ timeout });

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
}
