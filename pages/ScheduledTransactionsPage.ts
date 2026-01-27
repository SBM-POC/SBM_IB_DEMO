// pageObject.ts
import { Page, Locator, expect } from '@playwright/test';
import { ReceiptHelper } from '../Helpers/RecieptHandler';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";

export class ScheduledTransactionsPage {
    private readonly page: Page;
    private readonly utilityLibraryPage;      

    constructor(page: Page) {
        this.page = page;
        this.utilityLibraryPage = new utilityLibrary(page);
    }

    async ExpandOnceOffTransactions(page:Page)
    {
        const onceOffTransactionPanel=this.page.locator(`xpath=//mat-expansion-panel//span[contains(text(),'Once-Off Transactions')]`);
        await onceOffTransactionPanel.click(); 
        await this.page.locator(`xpath=//mat-expansion-panel//span[contains(text(),'Once-Off Transactions')]/ancestor::mat-expansion-panel-header[contains(@class,'mat-expanded')]`).waitFor({ state: 'visible' });
    }

    async VerifyScheduledTransactionDetails(page: Page, transferType: string, transactionDate: string, transactionType: string, currency: string, amount: string, remarks: string, receivingAccount: string) {
        await this.ExpandOnceOffTransactions(page);
        await this.page.locator(`xpath=//app-account-scheduled-transactions//app-forward-dated-txn-list`).waitFor({ state: 'visible' });

        const allTransactions = await this.page.locator(`xpath=//app-account-scheduled-transactions//app-forward-dated-txn-list//mat-expansion-panel`).all();
        for (const txn of allTransactions) {
            const captionTexts1 = await txn.allInnerTexts();
            const captionTexts=captionTexts1.join(' ')
            if (captionTexts.includes(transferType) && captionTexts.includes(transactionDate) && captionTexts.includes(transactionType)&& captionTexts.includes(currency)&& captionTexts.includes(amount)&& captionTexts.includes(remarks))
            {            
                await txn.click();

                const receivingAccFld= this.page.locator(`xpath=//app-forward-dated-txn-list//div[contains(@class,'general-details')]//label[contains(text(),'Receiving Account')]/following-sibling::div[contains(text(),'${receivingAccount}')]`);
                await this.utilityLibraryPage.isElementVisible(receivingAccFld, "Receiving Account in Scheduled Transaction", receivingAccount);

                const currencyAmount= currency+' '+amount
                const currencyAmountFld= this.page.locator(`xpath=//app-forward-dated-txn-list//div[contains(@class,'general-details')]//label[contains(text(),'Amount')]/following-sibling::div/app-amount[contains(text(),'${currency}')][contains(text(),'${amount}')]`);
                await this.utilityLibraryPage.isElementVisible(currencyAmountFld, "Amount in Scheduled Transaction", currencyAmount);

                const transferTypeFld= this.page.locator(`xpath=//app-forward-dated-txn-list//div[contains(@class,'general-details')]//label[contains(text(),'Transaction Type')]/following-sibling::div[contains(text(),'${transferType}')]`);
                await this.utilityLibraryPage.isElementVisible(transferTypeFld, "Transaction Type in Scheduled Transaction", transferType);
                
                const dateFld= this.page.locator(`xpath=//app-forward-dated-txn-list//div[contains(@class,'general-details')]//label[contains(text(),'Date of Payment')]/following-sibling::div[contains(text(),'${transactionDate}')]`);
                await this.utilityLibraryPage.isElementVisible(dateFld, "Date of Payment in Scheduled Transaction", transactionDate);

                const detailsFld= this.page.locator(`xpath=//app-forward-dated-txn-list//div[contains(@class,'general-details')]//label[contains(text(),'Details')]/following-sibling::div[contains(text(),'${remarks}')]`);
                await this.utilityLibraryPage.isElementVisible(detailsFld, "Details in Scheduled Transaction", remarks);
                break;
            }
        }

    }
}