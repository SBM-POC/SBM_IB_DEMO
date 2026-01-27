import { expect, Page, Locator } from '@playwright/test';
import { TransferFormData } from '../Utils/Types';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import {utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";


export class TransferFormHandler {
  // Locators using proximity selectors (not fragile dynamic IDs)
  private ddlFromAccount: Locator;  
  private txtAmountInput: Locator;
  private txtRecipientInput: Locator;
  private txtRemarksInput: Locator;
  private accountDisplay: Locator;

  private amountError: Locator;
  private recipientError: Locator;
  private remarksError: Locator;
  private sameAccountError: Locator;

  private dateInput: Locator;
  private readonly utilityLibraryPage: utilityLibrary;
  private calendarButton: Locator;


  constructor(private readonly page: Page) {
    // Input fields
    this.ddlFromAccount = page.locator("xpath=//mat-label[contains(text(),'From Account')]/../../mat-select");    
    this.txtAmountInput = page.locator('#transaction_amount');
    this.txtRecipientInput = page.locator('#beneficiary_recipientaccount');
    this.txtRemarksInput = page.locator('#beneficiary_payment_detail');
    this.accountDisplay = page.locator('.acc-number');
    this.dateInput = page.locator('#beneficiary_date-datepicker');

    // Error message elements located via field context, not text or ID
    this.amountError = page.locator('mat-form-field:has(#transaction_amount) mat-error');
    this.recipientError = page.locator('mat-form-field:has(#beneficiary_recipientaccount) mat-error');
    this.remarksError = page.locator('mat-form-field:has(#beneficiary_payment_detail) mat-error');
    this.sameAccountError = page.locator('mat-error').filter({ hasText: /sending and receiving accounts/i });
    this.utilityLibraryPage = new utilityLibrary(page)
    this.calendarButton = page.locator(`xpath=//button//mat-icon[contains(@id,'datepicker-icon')]`);

  }

  /**
   * Fills the transfer form and validates fields based on provided data
   * Returns true only if all inputs are logically valid
   */
  async fill(data: TransferFormData){
    await waitForSpinnerToDisappear(this.page);
          const testDataUsed = `        
          - From Account:'${data.senderAccount}'
          - Amount:'${data.amount}'
          - Recipient A/C No.:'${data.toAccount}'
          - Remarks:'${data.remarks}'`;
          await allure.attachment("Test Data", testDataUsed, "text/plain"); 


    // ─────────── SENDER ACCOUNT ───────────
      if(data.senderAccount.trim().length>0)
      {
          await this.ddlFromAccount.click();
          await (this.page.locator("xpath=//div[@role='listbox'][contains(@class,'account-select')]")).waitFor({ state: 'visible', timeout: 10000 });;
          const optionToSelect = await this.page.locator(`mat-option:has-text("${data.senderAccount}")`);
          await optionToSelect.scrollIntoViewIfNeeded();
          await optionToSelect.click();
      }

    // ─────────── AMOUNT ───────────
    if (data.amount.trim().length> 0) {
      await this.txtAmountInput.clear();
      await this.txtAmountInput.fill(data.amount);
    }
    // ─────────── VERIFY CURRENCY ───────────
    //const CurrencyLabel=await (this.page.locator(`xpath=//label[@for='transaction_amount']/following-sibling::span[contains(text(),'${data.currency}')]`));
    //const errorMsg= "The element CurrencyLabel with value "+data.currency+" is not visible.";
    //isElementVisible(this.page,CurrencyLabel,errorMsg);

    // ─────────── RECIPIENT ───────────
    if (data.toAccount.trim().length> 0) {
      await this.txtRecipientInput.clear();    
      await this.txtRecipientInput.fill(data.toAccount);
    }
    // ─────────── TRANSACTION DATE ───────────
    if (data.paymentDate.trim().length> 0) {
      const dateToSelect= await this.utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate);
      await this.utilityLibraryPage.SelectDateInCalendar(this.calendarButton,dateToSelect);

  }

    // ─────────── REMARKS ───────────
    if (data.remarks.trim().length> 0) {
      await this.txtRemarksInput.clear();
       await this.txtRemarksInput.fill(data.remarks);

  }
}

  /**
   * Get the selected transfer date for dialog verification
   */
  async getTransferDate(): Promise<string> {
    return (await this.dateInput.inputValue()).trim();
  }

  /**
   * mapping with expected dataset values
   */
  getErrorLocators(): Record<string, Locator> {
    return {
      ErrMsg_Amount: this.amountError,
      ErrMsg_AC_No: this.recipientError,
      ErrMsg_Remarks: this.remarksError,
      ErrMsg_SameAccount: this.sameAccountError
    };
  }
}

