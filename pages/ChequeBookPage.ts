import { Page, Locator, expect } from '@playwright/test';
import * as allure from "allure-js-commons";
import { utilityLibrary } from '../Utils/utilityLibrary';

export class ChequeBookPage {
    private readonly page: Page;
    public readonly ddlFromAccount: Locator;
    public readonly ddlCollectionBranch: Locator;
    public readonly ddlLeavesNum: Locator;
    public readonly ddlCrossType: Locator;
    public readonly txtRemarks: Locator;
    public readonly txtCustomerName: Locator;
    public readonly btnRequest: Locator;

    private readonly utilityLibraryPage: utilityLibrary;

    constructor(page: Page) {
        this.page = page;
        this.ddlFromAccount = page.locator(`xpath=//mat-label[contains(text(),'From Account')]/ancestor::label/following-sibling::mat-select`);
        this.ddlCollectionBranch = page.locator(`xpath=//mat-label[contains(text(),'Collection Branch')]/ancestor::label/following-sibling::mat-select`);
        this.ddlLeavesNum = page.locator(`xpath=//mat-label[contains(text(),'No of cheque leaves')]/ancestor::label/following-sibling::mat-select`);
        this.ddlCrossType = page.locator(`xpath=//mat-label[contains(text(),'Cross Type')]/ancestor::label/following-sibling::mat-select`);
        this.txtRemarks = page.locator(`xpath=//mat-label[contains(text(),'Remarks')]/ancestor::label/following-sibling::input`);
        this.txtCustomerName = page.locator(`xpath=//mat-label[contains(text(),'Customer Name')]/ancestor::label/following-sibling::input`);
        this.btnRequest = page.locator(`xpath=//button//span[contains(text(),'Request Cheque Book')]`);
       
        this.utilityLibraryPage = new utilityLibrary(page)

    }

    async filNewChequeBookForm(senderAccount: string, custName: string, collBranch: string, numberofLeaves:string,crossType:string,remarks: string) {
        const testDataUsed = `        
                  - From Account:'${senderAccount}'
                  - Customer Name:'${custName}'
                  - Collection Branch:'${collBranch}'
                  - No of cheque leaves: '${numberofLeaves}'
                  - Cross Type: '${crossType}'
                  - Remarks:'${remarks}'`;
        await allure.attachment("Test Data", testDataUsed, "text/plain");
        if (senderAccount.trim().length > 0) {
            await this.ddlFromAccount.click();
            const optionToSelect = await this.page.locator(`mat-option:has-text("${senderAccount}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (custName.trim().length > 0) {
            await this.txtCustomerName.clear();
            await this.txtCustomerName.fill(custName);
        }                
        if (collBranch.trim().length > 0) {
            await this.ddlCollectionBranch.click();
            const optionToSelect = await this.page.locator(`mat-option:has-text("${collBranch}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
                
        if (numberofLeaves.trim().length > 0) {
            await this.ddlLeavesNum.click();
            const optionToSelect = await this.page.locator(`mat-option:has-text("${numberofLeaves}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
                
        if (crossType.trim().length > 0) {
            await this.ddlCrossType.click();
            const optionToSelect = await this.page.locator(`mat-option:has-text("${crossType}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
        if (remarks.trim().length > 0) {
            await this.txtRemarks.clear();
            await this.txtRemarks.fill(remarks);
        }
    }

    async ClickRequest()
    {
        await this.btnRequest.waitFor({state:'visible'})
        await this.btnRequest.click();
    }
}