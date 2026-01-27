import { Page, Locator, expect } from '@playwright/test';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-js-commons";
import fs from "fs";
import path from "path";
import PDFParser from "pdf2json";
import { ReceiptHelper } from '../Helpers/RecieptHandler';


export class TransactionHistoryPage {
    private readonly page: Page;
    private readonly utilityLibraryPage: utilityLibrary;
    private readonly searchButton: Locator;
    private readonly moreMenuButton: Locator;
    private readonly noTransactionPopUp: Locator;
    private readonly transactionHisOption: Locator;
    private readonly accountDetailsOption: Locator;
    private readonly accountActivityOption: Locator;
    public readonly scheduledTransactionsOption: Locator;
    private downloadFolder: string;


    constructor(page: Page) {
        this.page = page;
        this.utilityLibraryPage = new utilityLibrary(page)
        this.searchButton = page.locator(`xpath=//app-transaction-history-search//button[contains(@id,'transaction_search_btn')]//span[contains(text(),'Search')]`);
        this.moreMenuButton = page.locator(`xpath=//button[contains(@id,'history_header_menu')]//mat-icon`);
        this.noTransactionPopUp = page.locator(`xpath=//*[contains(text(),'No Transactions Found. Please try another search.')]`);
        this.transactionHisOption = page.locator(`xpath=//app-account-container//mat-card//a[contains(text(),'Transaction History')]`);
        this.accountDetailsOption = page.locator(`xpath=//app-account-container//mat-card//a[contains(text(),'Account Details')]`);
        this.accountActivityOption = page.locator(`xpath=//app-account-container//mat-card//a[contains(text(),'Account Activity')]`);
        this.scheduledTransactionsOption = page.locator(`xpath=//app-account-container//mat-card//a[contains(text(),'Scheduled Transactions')]`);
        this.downloadFolder = path.resolve(__dirname, '..', 'Data', 'Statement');

    }

    async OpenTransactionHistoryScreen(page: Page, accountNum: string, timeout = 100000) {
        await waitForSpinnerToDisappear(page);
        //expand account panel
        const currentAccountPanel = page.locator(`xpath=//mat-expansion-panel-header[contains(.,"${accountNum}")]`);
        await currentAccountPanel.waitFor({ state: 'visible', timeout });
        await currentAccountPanel.click();

        //verify if panel opens
        await expect(currentAccountPanel).toHaveAttribute('aria-expanded', 'true');

        //click on more to go to the transaction history search page
        const viewMoreButton = page.locator(`xpath=//mat-expansion-panel-header[contains(.,"${accountNum}")]/following-sibling::div//span[contains(., 'View More')][contains(@class,'button')]`);
        await viewMoreButton.waitFor({ state: 'visible', timeout });
        await viewMoreButton.click();

        await waitForSpinnerToDisappear(page);

        //wait for transation search page to open
        const accountView = page.locator(`xpath=//app-account-container//h3[contains(text(),'Account View')]`);
        await accountView.waitFor({ state: 'visible', timeout });
    }
    async ClickSearchTransactionHistory(page: Page, timeout = 15000) {
        //wait for transaction history page to open
        const searchButton = page.locator(`xpath=//app-transaction-history//button[@id='btn_search']`);
        await searchButton.waitFor({ state: 'visible', timeout });
        await searchButton.click();

        await waitForSpinnerToDisappear(page);

        await page.locator(`xpath=//app-transaction-history-search//mat-label[text()='Reference Number']`).waitFor({ state: 'visible', timeout });
    }

    async ClickSearch(page: Page, timeout = 15000) {
        await this.searchButton.waitFor({ state: 'visible', timeout });
        await this.searchButton.click();

        await waitForSpinnerToDisappear(page);
    }


    async SearchByReferenceID(page: Page, referenceID: string, timeout = 15000) {
        //wait for transation search page to open
        const referenceLabel = page.locator(`xpath=//app-transaction-history-search//mat-label[text()='Reference Number']`);
        await referenceLabel.waitFor({ state: 'visible', timeout });
        await referenceLabel.click();

        //enter reference in reference text field to search
        const referenceTxtFld = page.locator(`xpath=//app-transaction-history-search//mat-label[text()='Reference Number']/..//following-sibling::input`);
        await referenceTxtFld.waitFor({ state: 'visible', timeout });
        await referenceLabel.click();
        await referenceLabel.fill(referenceID);

        const applyButton = page.locator(`xpath=//app-transaction-history-search//span[contains(text(),'Apply')]`);
        await applyButton.waitFor({ state: 'visible', timeout });
        await applyButton.click();
    }
    async SearchByText(page: Page, searchText: string, timeout = 15000) {
        //wait for transation search page to open
        const searchTextLabel = page.locator(`xpath=//app-transaction-history-search//mat-label[text()='By Text']`);
        await searchTextLabel.waitFor({ state: 'visible', timeout });
        await searchTextLabel.click();

        //enter text in by text field to search
        const searchTxtFld = page.locator(`xpath=//app-transaction-history-search//mat-label[text()='By Text']/..//following-sibling::input`);
        await searchTxtFld.waitFor({ state: 'visible', timeout });
        await searchTxtFld.click();
        await searchTxtFld.fill(searchText);

    }
    async SearchByDate(page: Page, fromDate: string, toDate: string, timeout = 15000) {
        const fromDateCalendarField = page.locator(`xpath=//button//mat-icon[contains(@id,'transactionDateFrom')]`);
        const toDateCalendarField = page.locator(`xpath=//button//mat-icon[contains(@id,'transactionDateTo')]`);

        await this.utilityLibraryPage.SelectDateInCalendar(fromDateCalendarField,fromDate);

        await this.utilityLibraryPage.SelectDateInCalendar(toDateCalendarField,toDate);
    }

    async SearchByPeriod(page: Page, period: string, timeout = 15000) {
        const periodToggle = page.locator(`xpath=//app-transaction-history-quick-search//button//span[contains(text(),'${period}')] `);
        await periodToggle.waitFor({ state: 'visible', timeout });
        await periodToggle.click();

    }

    async SearchByTransactionType(page: Page, transactionType: string, timeout = 15000) {
        const accountTypeToggle = page.locator(`xpath=//app-transaction-history-quick-search//button//span[contains(text(),'${transactionType}')] `);
        await accountTypeToggle.waitFor({ state: 'visible', timeout });
        await accountTypeToggle.click();


    }
    async SearchByAmount(page: Page, fromAmount: string, toAmount: string, timeout = 15000) {
        //wait for transation search page to open
        const fromAmountLabel = page.locator(`xpath=//app-transaction-history-search//mat-label[text()='From Amount']`);
        await fromAmountLabel.waitFor({ state: 'visible', timeout });
        await fromAmountLabel.click();

        //enter amount in from amount field to search
        const fromAmountTxtFld = page.locator(`xpath=//app-transaction-history-search//mat-label[text()='From Amount']/..//following-sibling::input`);
        await fromAmountTxtFld.waitFor({ state: 'visible', timeout });
        await fromAmountTxtFld.click();
        await fromAmountTxtFld.fill(fromAmount);

        //enter amount in to amount field to search
        const toAmountTxtFld = page.locator(`xpath=//app-transaction-history-search//mat-label[text()='To Amount']/..//following-sibling::input`);
        await toAmountTxtFld.waitFor({ state: 'visible', timeout });
        await toAmountTxtFld.click();
        await toAmountTxtFld.fill(toAmount);
    }

    async VerifyInSearchResults(page: Page, text: string, fromDate: string, toDate: string, period: string, transactionType: string, fromAmount: string, toAmount: string) {
        const numRows = page.locator(`xpath=//app-transaction-history-statement-summary`);

        const numberOfRows = await numRows.count();
        for (let i = 1; i < numberOfRows; i++) {
            if (text.trim().length > 0) {
                const textLabel = page.locator(`xpath=(//app-transaction-history-statement-summary)[+${i}+]//div[contains(@class,'show-gt-xs')]//p[contains(@class,'text-truncate')][contains(text(),'${text}')]`);
                await this.utilityLibraryPage.isVisible(page, textLabel, text + " in row " + i);
            }
            if (fromDate.trim().length > 0) {
                const from = await this.utilityLibraryPage.parseDate(fromDate);
                const to = await this.utilityLibraryPage.parseDate(toDate);

                const dateLabel = (await page.locator(`xpath=(//app-transaction-history-statement-summary)[+${i}+]//div[contains(@class,'show-gt-xs')]//p[contains(@class,'data-label')]`).innerText()).trim();
                const dateVal=await this.utilityLibraryPage.parseDate(dateLabel);

                if (dateVal >= from && dateVal <= to) {                  
                    const dateLabelLocator= page.locator(`xpath=(//app-transaction-history-statement-summary)[+${i}+]//div[contains(@class,'show-gt-xs')]//p[contains(@class,'data-label')]`);
                    await this.utilityLibraryPage.isVisible(page, dateLabelLocator, dateVal + " within range "+from+" "+to+" in row " + i);

                }
            }

            if (transactionType.trim().length > 0) {  

                const amountLabel = (await page.locator(`xpath=(//app-transaction-history-statement-summary)[+${i}+]//div[contains(@class,'show-gt-xs')]//p[contains(@class,'amount')]//app-amount`).innerText()).trim();

                if (transactionType.trim().toLowerCase() === "debit") {
                    try {
                        expect(amountLabel).toContain("-");
                        allure.attachment(`The amount in row +${i}+ represents a debited amount`, "", { contentType: "text/plain" });
                    }
                    catch (error) {
                        const failMessage = `The amount in row +${i}+ does not represent a debited amount.`;
                        allure.attachment(failMessage, "", "text/plain");
                        throw new Error(failMessage);
                    }
                }
                 if (transactionType.trim().toLowerCase() === "credit") {
                    try {
                        expect(amountLabel).toContain("-");
                        allure.attachment(`The amount in row +${i}+ represents a credited amount`, "", { contentType: "text/plain" });
                    }
                    catch (error) {
                        const failMessage = `The amount in row +${i}+ does not represent a credited amount.`;
                        allure.attachment(failMessage, "", "text/plain");
                        throw new Error(failMessage);
                    }
                }

            }
            if (fromAmount.trim().length > 0) {

                const amountText = (
                    await page
                        .locator(`xpath=(//app-transaction-history-statement-summary)[${i}]//div[contains(@class,'show-gt-xs')]//p[contains(@class,'amount')]//app-amount`)
                        .innerText()
                ).trim();
                const amountLocator =  page.locator(`xpath=(//app-transaction-history-statement-summary)[${i}]//div[contains(@class,'show-gt-xs')]//p[contains(@class,'amount')]//app-amount`);

                // Remove spaces and extract number
                const cleaned = amountText.replace(/\s/g, '');   // e.g. "-€2.00"
                const match = cleaned.match(/([\d.,]+)/);

                if (!match) {
                    throw new Error(`Could not extract amount from: ${amountText}`);
                }

                // Convert to float
                const amount = parseFloat(match[1].replace(",", "."));

                // Convert input values
                const fromAmountFloat = parseFloat(fromAmount);
                const toAmountFloat = parseFloat(toAmount);

                // Range check
                if (amount >= fromAmountFloat && amount <= toAmountFloat) {
                    await this.utilityLibraryPage.isVisible(page, amountLocator, amountText + " within range "+fromAmountFloat+" "+toAmountFloat+" in row " + i);
                } else {
                    await this.utilityLibraryPage.isVisible(page, amountLocator, amountText + " within range "+fromAmountFloat+" "+toAmountFloat+" in row " + i);
                }
            }
        }

    }

    async VerifyTransactionDetails(page: Page, paymentDate: string, SenderNickname: string, SenderAccount: string, RecipientAccount: string, TransferAmount: string, Currency: string, Remarks: string, timeout = 10000) {
        const transactionSearchResultBtn = page.locator(`xpath=(//app-transaction-history-statement-summary//button[contains(@id,'BW_button_173937')])[1]`);
        await transactionSearchResultBtn.waitFor({ state: 'visible', timeout });
        await transactionSearchResultBtn.click();

        await waitForSpinnerToDisappear(page);
        await page.locator(`xpath=//app-transaction-history-search-results//app-transaction-history-statement-detail`).waitFor({ state: 'visible', timeout });
        if (SenderNickname.trim().length > 0) {
            const accountNickname = page.locator(`xpath=//div[@class='account-info']//mat-label[normalize-space(text())='${SenderNickname}']`);
            await this.utilityLibraryPage.isElementVisible(accountNickname, "Account Nickname", SenderNickname);
        }
        if (SenderAccount.trim().length > 0) {
            const fromAccount = page.locator(`xpath=//app-summary-data-item//*[contains(text(),'${SenderAccount}')]`);
            await this.utilityLibraryPage.isElementVisible(fromAccount, "From Account", SenderAccount);
        }
        if (RecipientAccount.trim().length > 0) {
            const toAccount = page.locator(`xpath=//app-transaction-details//p[contains(text(),'To')]/following-sibling::p/*[contains(text(),'${RecipientAccount}')]`);
            await this.utilityLibraryPage.isElementVisible(toAccount, "To Account", RecipientAccount);
        }
        if (paymentDate.trim().length > 0) {
            const paymentDateFld = page.locator(`xpath=//app-transaction-history-statement-detail//p[contains(@class,'date')][contains(text(),'${paymentDate}')]`);
            await this.utilityLibraryPage.isElementVisible(paymentDateFld, "Transaction Date", paymentDate);
        }

        if (TransferAmount.trim().length > 0) {
            var currencyShortForm = "";
            if (Currency === "EUR") {
                currencyShortForm = "€";
            }
            const transferAmount = page.locator(`xpath=//app-transaction-history-statement-detail//app-amount[contains(text(),'${currencyShortForm}') and contains(text(),'${TransferAmount}')]`);
            await this.utilityLibraryPage.isElementVisible(transferAmount, "Amount", TransferAmount);
        }

        if (Remarks.trim().length > 0) {
            const remarks = page.locator(`xpath=//app-transaction-details//p[contains(text(),'Narrative')]/following-sibling::p/*[contains(text(),'${Remarks}')]`);
            await this.utilityLibraryPage.isElementVisible(remarks, "Remarks", Remarks);
        }
    }

    async VerifyTransactionHistoryScreen(page: Page, accountType: string, SenderNickname: string, SenderAccount: string, timeout = 10000) {
       

        //Verify Account Nickname and Account Number and Balance label
        if (SenderNickname.trim().length > 0) {
            const accountNickname = page.locator(`xpath=//div[@class='account-info']//mat-label[normalize-space(text())='${SenderNickname}']`);
            await this.utilityLibraryPage.isElementVisible(accountNickname, "Account Nickname", SenderNickname);
        }
        if (SenderAccount.trim().length > 0) {
            const fromAccount = page.locator(`xpath=//app-summary-data-item//*[contains(text(),'${SenderAccount}')]`);
            await this.utilityLibraryPage.isElementVisible(fromAccount, "From Account", SenderAccount);
        }
        const balanceLabel = page.locator(`xpath=//app-summary-data-item//app-amount`)
        await this.utilityLibraryPage.isVisible(page, balanceLabel, "Availance Balance");


        await allure.step('Verify Account Options and transaction list view', async () => {

            switch (accountType.toLowerCase().trim()) {
                case "current and saving ":
                    await this.page.locator(`xpath=//p[contains(text(),'You can search/view transactions for last 1 year.')]`).waitFor({ state: 'visible', timeout });
                    //verify the different details of the transaction
                    const transactionDate = page.locator(`xpath=((//app-transaction-history-statement-summary)[1]//div[contains(@class,'show-gt-xs')]//div[contains(@class,'row')])[1]//p[contains(@class,'data-label')]`);
                    await this.utilityLibraryPage.isElementVisible(transactionDate, "Transaction Date label", (await (transactionDate.innerText())).trim());

                    const amountLabel = page.locator(`xpath=((//app-transaction-history-statement-summary)[1]//div[contains(@class,'show-gt-xs')]//div[contains(@class,'row')])[1]//app-amount`);
                    await this.utilityLibraryPage.isElementVisible(amountLabel, "The Debit/Credit Amount label", (await (amountLabel.innerText())).trim());

                    const remarksLabel = page.locator(`xpath=((//app-transaction-history-statement-summary)[1]//div[contains(@class,'show-gt-xs')]//div[contains(@class,'row')])[2]//p[contains(@class,'text')]`);
                    await this.utilityLibraryPage.isElementVisible(remarksLabel, "The Remarks label", (await (remarksLabel.innerText())).trim());

                    const runningBalLabel = page.locator(`xpath=((//app-transaction-history-statement-summary)[1]//div[contains(@class,'show-gt-xs')]//div[contains(@class,'row')])[2]//app-amount`);
                    await this.utilityLibraryPage.isElementVisible(runningBalLabel, "The Running Balance label", (await (runningBalLabel.innerText())).trim());

                    await allure.step('Verify Export Options', async () => {
                        await this.VerifyExportOptions(page)
                    });
                    //check account options
                    await this.utilityLibraryPage.isVisible(page, this.accountDetailsOption, "Account Activity");
                    await this.utilityLibraryPage.isVisible(page, this.scheduledTransactionsOption, "Scheduled Transactions");
                    break;
                case "term deposit":
                    await this.utilityLibraryPage.isVisible(page, this.accountActivityOption, "Account Activity");
                    break;
                case "credit card":
                    break;
                case "prepaid card":
                    break;
                case "loan":
                    break;
            }
        });

    }

    async GetAccountDetails(page: Page, accountType: string, timeout = 15000) {                    
        const accountDetailsOption = page.locator(`xpath=//app-account-container//mat-card//a[contains(text(),'Account Details')]`);
        await accountDetailsOption.click();
        switch (accountType.toLowerCase().trim()) {
            case "current and saving":
                await this.VerifyCASAccountDetails(page)
                break;
            case "credit card":
                await this.VerifyCreditCardDetails(page)
                break;
            case "prepaid card":
                await this.VerifyPrepaidCardDetails(page)
                break;
            case "loan":
                await this.VerifyLoanDetails(page)
                break;
            case "term deposit":
                await this.VerifyTermDepositDetails(page)
                break;
        }
    
    }

    async VerifyExportOptions(page: Page, timeout = 15000) {

        //click on More
        await this.moreMenuButton.click();
        await this.page.locator(`xpath=//div[contains(@id,'overlay')]//div[contains(@class,'menu-panel')]`).waitFor({ state: 'visible', timeout });

        //click to check for export
        const exportButton = this.page.locator(`xpath=//div[contains(@id,'overlay')]//button[contains(@id,'btn_export')]`);
        await exportButton.waitFor({ state: 'visible', timeout })
        await exportButton.click();

        const pdfOption = page.locator(`xpath=//mat-dialog-container//mat-radio-group//mat-radio-button[contains(@id,'opt-pdf')]`);
        const rtfOption = page.locator(`xpath=//mat-dialog-container//mat-radio-group//mat-radio-button[contains(@id,'opt-rtf')]`);
        const csvOption = page.locator(`xpath=//mat-dialog-container//mat-radio-group//mat-radio-button[contains(@id,'opt-csv')]`);
        const xlsxOption = page.locator(`xpath=//mat-dialog-container//mat-radio-group//mat-radio-button[contains(@id,'opt-xlsx')]`);
        const mt940Option = page.locator(`xpath=//mat-dialog-container//mat-radio-group//mat-radio-button[contains(@id,'opt-mt940')]`);
        const fileNameTxtField = page.locator(`xpath=//mat-dialog-container//input[contains(@id,'fileName')]`);

        //wait for export dialog to open
        await this.page.locator(`xpath=//mat-dialog-container//h2[contains(text(),'Export Data')]`).waitFor({ state: 'visible', timeout });

        //verify options for file type
        await this.utilityLibraryPage.isVisible(page, pdfOption, "PDF Option");
        await this.utilityLibraryPage.isVisible(page, rtfOption, "RTF Option");
        await this.utilityLibraryPage.isVisible(page, csvOption, "CSV Option");
        await this.utilityLibraryPage.isVisible(page, xlsxOption, "XLSX Option");
        await this.utilityLibraryPage.isVisible(page, mt940Option, "MT940 Option");
        await this.utilityLibraryPage.isVisible(page, fileNameTxtField, "FileName field");

        await this.page.locator(`xpath=//mat-dialog-container//button//span[contains(text(),'Cancel')]`).click();

    }
    async VerifyCASAccountDetails(page: Page) {
        //Account Nickname
        const accNicknameLabel = page.locator(`xpath=//label[contains(text(),'Account Nickname')]/../following-sibling::div/div[contains(@class,'account-name')]`);
        const accNickname= (await accNicknameLabel.innerText()).trim();
        await this.utilityLibraryPage.isElementVisible(accNicknameLabel, "Account Nickname", accNickname);

        //Account Name
        const accNameLabel = page.locator(`xpath=//label[contains(text(),'Account Name')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accNameLabel, "Account Name", (await (accNameLabel.innerText())).trim());

        //Product Type
        const productTypeLabel = page.locator(`xpath=//label[contains(text(),'Product Type')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(productTypeLabel, "Product Type", (await productTypeLabel.innerText()).trim());

        //Product Description
        const productDescriptionLabel = page.locator(`xpath=//label[contains(text(),'Product Description')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(productDescriptionLabel, "Product Description", (await productDescriptionLabel.innerText()).trim());

        //Mode of Operation
        const modeofOperationLabel = page.locator(`xpath=//label[contains(text(),'Mode of Operation')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(modeofOperationLabel, "Mode of Operation", (await modeofOperationLabel.innerText()).trim());

        //Account Number
        const accNumberLabel = page.locator(`xpath=//label[contains(text(),'Account Number')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accNumberLabel, "Account Number", (await accNumberLabel.innerText()).trim());

        //Account Currency
        const accCurrencyLabel = page.locator(`xpath=//label[contains(text(),'Account Currency')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accCurrencyLabel, "Account Currency", (await accCurrencyLabel.innerText()).trim());

        //Account Open Date
        const accOpenDateLabel = page.locator(`xpath=//label[contains(text(),'Account Open Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accOpenDateLabel, "Account Open Date", (await accOpenDateLabel.innerText()).trim());

        //IBAN
        const IBANLabel = page.locator(`xpath=//label[contains(text(),'IBAN')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(IBANLabel, "IBAN", (await IBANLabel.innerText()).trim());

        //Account Status
        const accStatusLabel = page.locator(`xpath=//label[contains(text(),'Account Status')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accStatusLabel, "Account Status", (await accStatusLabel.innerText()).trim());

        //Ledger Balance
        const ledgerBalanceLabel = page.locator(`xpath=//label[contains(text(),'Ledger Balance')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(ledgerBalanceLabel, "Ledger Balance", (await ledgerBalanceLabel.innerText()).trim());

        //Available Balance
        const availableBalanceLabel = page.locator(`xpath=//label[contains(text(),'Available Balance')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(availableBalanceLabel, "Available Balance", (await availableBalanceLabel.innerText()).trim());

        //Lien Balance
        const lienBalanceLabel = page.locator(`xpath=//label[contains(text(),'Lien Balance')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(lienBalanceLabel, "Lien Balance", (await lienBalanceLabel.innerText()).trim());

        //Overdraft Limit
        const overdraftLabel = page.locator(`xpath=//label[contains(text(),'Overdraft Limit')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(overdraftLabel, "Overdraft Limit", (await overdraftLabel.innerText()).trim());

        //Uncleared balance
        const unclearedBalanceLabel = page.locator(`xpath=//label[contains(text(),'Uncleared balance')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(unclearedBalanceLabel, "Uncleared balance", (await unclearedBalanceLabel.innerText()).trim());

    }
    async VerifyCreditCardDetails(page: Page) {
        //Credit Card Nickname
        const cardNicknameLabel = page.locator(`xpath=//label[contains(text(),'Card Nickname')]/../following-sibling::div/div[contains(@class,'account-name')]`);
        await this.utilityLibraryPage.isElementVisible(cardNicknameLabel, "Credit Card Nickname", (await cardNicknameLabel.innerText()).trim());

        //Cardholder Name
        const cardHolderNameLabel = page.locator(`xpath=//label[contains(text(),'Cardholder Name')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardHolderNameLabel, "Cardholder Name", (await cardHolderNameLabel.innerText()).trim());

        //Card Currency
        const cardCurrencyLabel = page.locator(`xpath=//label[contains(text(),'Card Currency')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardCurrencyLabel, "Card Currency", (await cardCurrencyLabel.innerText()).trim());

        //Address
        const addressLabel = page.locator(`xpath=//label[contains(text(),'Address')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(addressLabel, "Address", (await addressLabel.innerText()).trim());

        //Card Type
        const cardTypeLabel = page.locator(`xpath=//label[contains(text(),'Card Type')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardTypeLabel, "Card Type", (await cardTypeLabel.innerText()).trim());

        //Scheme Description
        const schemeDescriptionLabel = page.locator(`xpath=//label[contains(text(),'Scheme Description')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(schemeDescriptionLabel, "Card Type", (await schemeDescriptionLabel.innerText()).trim());

        //Card Issuer
        const cardIssuerLabel = page.locator(`xpath=//label[contains(text(),'Card Issuer')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardIssuerLabel, "Card Issuer", (await cardIssuerLabel.innerText()).trim());

        //Expiry Date
        const expiryDateLabel = page.locator(`xpath=//label[contains(text(),'Expiry Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(expiryDateLabel, "Expiry Date", (await expiryDateLabel.innerText()).trim());

        //Status
        const statusLabel = page.locator(`xpath=//label[contains(text(),'Status')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(statusLabel, "Status", (await statusLabel.innerText()).trim());

        //Minimum Amount Due
        const minAmtDueLabel = page.locator(`xpath=//label[contains(text(),'Minimum Amount Due')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(minAmtDueLabel, "Minimum Amount Due", (await minAmtDueLabel.innerText()).trim());

        //Total Amount Due
        const totalAmtDueLabel = page.locator(`xpath=//label[contains(text(),'Total Amount Due')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(totalAmtDueLabel, "Total Amount Due", (await totalAmtDueLabel.innerText()).trim());

        //Total Credit Limit
        const totalCreditLimitLabel = page.locator(`xpath=//label[contains(text(),'Total Credit Limit')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(totalCreditLimitLabel, "Total Credit Limit", (await totalCreditLimitLabel.innerText()).trim());

        //Daily Withdrawal limit
        const withdrawalLabel = page.locator(`xpath=//label[contains(text(),'Daily Withdrawal limit')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(withdrawalLabel, "Daily Withdrawal limit", (await withdrawalLabel.innerText()).trim());

        //Available Balance
        const availableBalanceLabel = page.locator(`xpath=//label[contains(text(),'Available Balance')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(availableBalanceLabel, "Available Balance", (await availableBalanceLabel.innerText()).trim());

        //Due Date
        const dueDateeLabel = page.locator(`xpath=//label[contains(text(),'Due Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(dueDateeLabel, "Due Date", (await dueDateeLabel.innerText()).trim());

        //Debiting Account Number
        const debitAccLabel = page.locator(`xpath=//label[contains(text(),'Debiting Account Number')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(debitAccLabel, "Debiting Account Number", (await debitAccLabel.innerText()).trim());

    }
    async VerifyPrepaidCardDetails(page: Page) {
        //Prepaid Card Nickname
        const cardNicknameLabel = page.locator(`xpath=//label[contains(text(),'Card Nickname')]/../following-sibling::div/div[contains(@class,'account-name')]`);
        await this.utilityLibraryPage.isElementVisible(cardNicknameLabel, "Prepaid Card Nickname", (await cardNicknameLabel.innerText()).trim());

        //Cardholder Name
        const cardHolderNameLabel = page.locator(`xpath=//label[contains(text(),'Cardholder Name')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardHolderNameLabel, "Cardholder Name", (await cardHolderNameLabel.innerText()).trim());

        //Address
        const addressLabel = page.locator(`xpath=//label[contains(text(),'Address')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(addressLabel, "Address", (await addressLabel.innerText()).trim());

        //Card Type
        const cardTypeLabel = page.locator(`xpath=//label[contains(text(),'Card Type')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardTypeLabel, "Card Type", (await cardTypeLabel.innerText()).trim());

        //Scheme Description
        const schemeDescriptionLabel = page.locator(`xpath=//label[contains(text(),'Scheme Description')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(schemeDescriptionLabel, "Card Type", (await schemeDescriptionLabel.innerText()).trim());

        //Card Number
        const cardNumberLabel = page.locator(`xpath=//label[contains(text(),'Card Number')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardNumberLabel, "Card Number", (await cardNumberLabel.innerText()).trim());

        //Card Currency
        const cardCurrencyLabel = page.locator(`xpath=//label[contains(text(),'Card Currency')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardCurrencyLabel, "Card Currency", (await cardCurrencyLabel.innerText()).trim());

        //Available Balance
        const availableBalanceLabel = page.locator(`xpath=//label[contains(text(),'Available Balance')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(availableBalanceLabel, "Available Balance", (await availableBalanceLabel.innerText()).trim());

        //Card Issuer
        const cardIssuerLabel = page.locator(`xpath=//label[contains(text(),'Card Issuer')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(cardIssuerLabel, "Card Issuer", (await cardIssuerLabel.innerText()).trim());

        //Expiry Date
        const expiryDateLabel = page.locator(`xpath=//label[contains(text(),'Expiry Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(expiryDateLabel, "Expiry Date", (await expiryDateLabel.innerText()).trim()); 4

        //Status
        const statusLabel = page.locator(`xpath=//label[contains(text(),'Status')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(statusLabel, "Status", (await statusLabel.innerText()).trim());

        //Daily Withdrawal limit
        const withdrawalLabel = page.locator(`xpath=//label[contains(text(),'Daily Withdrawal limit')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(withdrawalLabel, "Daily Withdrawal limit", (await withdrawalLabel.innerText()).trim());

    }
    async VerifyTermDepositDetails(page: Page) {

        //Account Nickname
        const accNicknameLabel = page.locator(`xpath=//label[contains(text(),'Account Nickname')]/../following-sibling::div/div[contains(@class,'account-name')]`);
        await this.utilityLibraryPage.isElementVisible(accNicknameLabel, "Account Nickname", (await accNicknameLabel.innerText()).trim());

        //Account Name
        const accNameLabel = page.locator(`xpath=//label[contains(text(),'Account Name')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accNameLabel, "Account Name", (await accNameLabel.innerText()).trim());

        //Product Type
        const productTypeLabel = page.locator(`xpath=//label[contains(text(),'Product Type')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(productTypeLabel, "Product Type", (await productTypeLabel.innerText()).trim());

        //Product Description
        const productDescriptionLabel = page.locator(`xpath=//label[contains(text(),'Product Description')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(productDescriptionLabel, "Product Description", (await productDescriptionLabel.innerText()).trim());

        //Mode of Operation
        const modeofOperationLabel = page.locator(`xpath=//label[contains(text(),'Mode of Operation')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(modeofOperationLabel, "Mode of Operation", (await modeofOperationLabel.innerText()).trim());

        //Account Number
        const accNumberLabel = page.locator(`xpath=//label[contains(text(),'Account Number')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accNumberLabel, "Account Number", (await accNumberLabel.innerText()).trim());

        //Account Currency
        const accCurrencyLabel = page.locator(`xpath=//label[contains(text(),'Account Currency')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accCurrencyLabel, "Account Currency", (await accCurrencyLabel.innerText()).trim());

        //Account Status
        const accStatusLabel = page.locator(`xpath=//label[contains(text(),'Account Status')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accStatusLabel, "Account Status", (await accStatusLabel.innerText()).trim());

        //Deposit Amount        
        const depositAmountLabel = page.locator(`xpath=//label[contains(text(),'Deposit Amount')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(depositAmountLabel, "Deposit Amount", (await depositAmountLabel.innerText()).trim());

        //Maturity Amount         
        const maturityAmountLabel = page.locator(`xpath=//label[contains(text(),'Maturity Amount')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(maturityAmountLabel, "Maturity Amount ", (await maturityAmountLabel.innerText()).trim());

        //Maturity Date         
        const maturityDateLabel = page.locator(`xpath=//label[contains(text(),'Maturity Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(maturityDateLabel, "Maturity Date", (await maturityDateLabel.innerText()).trim());

        //Opening Date
        const openDateLabel = page.locator(`xpath=//label[contains(text(),'Opening Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(openDateLabel, "Opening Date", (await openDateLabel.innerText()).trim());

        //Interest Rate   
        const interestRateLabel = page.locator(`xpath=//label[contains(text(),'Interest Rate')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(interestRateLabel, "Interest Rate ", (await interestRateLabel.innerText()).trim());

        //Tenure 
        const tenureLabel = page.locator(`xpath=//label[contains(text(),'Tenure')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(tenureLabel, "Tenure", (await tenureLabel.innerText()).trim());

        //Renewal Option
        const renewalOptionLabel = page.locator(`xpath=//label[contains(text(),'Renewal Option')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(renewalOptionLabel, "Renewal Option", (await renewalOptionLabel.innerText()).trim());

        //Auto Closure
        const autoClosureLabel = page.locator(`xpath=//label[contains(text(),'Auto Closure')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(autoClosureLabel, "Auto Closure", (await autoClosureLabel.innerText()).trim());

    }
    async VerifyLoanDetails(page: Page) {

        //Account Nickname
        const accNicknameLabel = await page.locator(`xpath=//label[contains(text(),'Account Nickname')]/../following-sibling::div/div[contains(@class,'account-name')]`);
        await this.utilityLibraryPage.isElementVisible(accNicknameLabel, "Account Nickname", (await accNicknameLabel.innerText()).trim());

        //Account Name
        const accNameLabel = page.locator(`xpath=//label[contains(text(),'Account Name')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accNameLabel, "Account Name", (await accNameLabel.innerText()).trim());

        //Product Type
        const productTypeLabel = page.locator(`xpath=//label[contains(text(),'Product Type')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(productTypeLabel, "Product Type", (await productTypeLabel.innerText()).trim());

        //Product Description
        const productDescriptionLabel = page.locator(`xpath=//label[contains(text(),'Product Description')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(productDescriptionLabel, "Product Description", (await productDescriptionLabel.innerText()).trim());

        //Mode of Operation
        const modeofOperationLabel = page.locator(`xpath=//label[contains(text(),'Mode of Operation')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(modeofOperationLabel, "Mode of Operation", (await modeofOperationLabel.innerText()).trim());

        //Account Number
        const accNumberLabel = page.locator(`xpath=//label[contains(text(),'Account Number')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accNumberLabel, "Account Number", (await accNumberLabel.innerText()).trim());

        //Account Currency
        const accCurrencyLabel = page.locator(`xpath=//label[contains(text(),'Account Currency')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accCurrencyLabel, "Account Currency", (await accCurrencyLabel.innerText()).trim());

        //Account Open Date
        const accOpenDateLabel = page.locator(`xpath=//label[contains(text(),'Account Open Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accOpenDateLabel, "Account Open Date", (await accOpenDateLabel.innerText()).trim());

        //Account Status
        const accStatusLabel = page.locator(`xpath=//label[contains(text(),'Account Status')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(accStatusLabel, "Account Status", (await accStatusLabel.innerText()).trim());

        //Loan Amount
        const loanAmountLabel = page.locator(`xpath=//label[contains(text(),'Loan Amount')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(loanAmountLabel, "Loan Amount", (await loanAmountLabel.innerText()).trim());

        //Amount outstanding
        const amountOutstandingLabel = page.locator(`xpath=//app-prepaid-details//label[contains(text(),'Amount outstanding')]`);
        await this.utilityLibraryPage.isElementVisible(amountOutstandingLabel, "Amount outstanding", (await amountOutstandingLabel.innerText()).trim());

        //Amount outstanding
        const amountArrearsLabel = page.locator(`xpath=//label[contains(text(),'Amount in Arrears')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(amountArrearsLabel, "Amount in Arrears", (await amountArrearsLabel.innerText()).trim());

        //Interest Rate
        const interestRateLabel = page.locator(`xpath=//label[contains(text(),'Interest Rate')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(interestRateLabel, "Interest Rate", (await interestRateLabel.innerText()).trim());

        //Loan Period
        const loanPeriodLabel = page.locator(`xpath=//label[contains(text(),'Loan Period')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(loanPeriodLabel, "Loan Period", (await loanPeriodLabel.innerText()).trim());

        //Next Instalment Date  
        const instalmentDateLabel = page.locator(`xpath=//label[contains(text(),'Next Instalment Date')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(instalmentDateLabel, "Next Instalment Date", (await instalmentDateLabel.innerText()).trim());

        //Instalment Amount
        const instalmentAmountLabel = page.locator(`xpath=//label[contains(text(),'Instalment Amount')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(instalmentAmountLabel, "Instalment Amount", (await instalmentAmountLabel.innerText()).trim());

        //Final Payment Date
        const finalPaymentLabel = page.locator(`xpath=//label[contains(text(),'Final Payment Date (Maturity Date)')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(finalPaymentLabel, "Final Payment Date (Maturity Date)", (await finalPaymentLabel.innerText()).trim());

        //Net Payoff amount
        const netPayAmountLabel = page.locator(`xpath=//label[contains(text(),'Net Payoff amount')]/following-sibling::div[1]`);
        await this.utilityLibraryPage.isElementVisible(netPayAmountLabel, "Net Payoff amount", (await netPayAmountLabel.innerText()).trim());
    }

    async DownloadStatement(page:Page, fileType:string,timeout=10000)
    {
        const downloadBtn= page.locator(`xpath=(//button[@id='download_btn'])[1]`);
        await downloadBtn.waitFor({ state: 'visible', timeout })
        await downloadBtn.click();

        const fileTypeRdBtn= page.locator(`xpath=//mat-radio-group//label[contains(text(),'${fileType}')]`)
        await fileTypeRdBtn.click();

        const exportBtn= await page.locator(`xpath=(//button[@id='btn_export_data'])[1]`);
        await exportBtn.waitFor({ state: 'visible', timeout })


        const [download] = await Promise.all([
            this.page.waitForEvent("download"),
            exportBtn.click(),
            waitForSpinnerToDisappear(this.page),
        ]);

         const statementMessage = page.locator(`xpath=//app-alert-popup//p[contains(text(),'Statement exported successfully')]/../following-sibling::button//mat-icon`)
        await expect(statementMessage).toBeVisible();


        const filename = download.suggestedFilename();
        expect(filename).toMatch(/^Statement_[\d_-]+\.pdf$/);

        // Ensure folder exists
        if (!fs.existsSync(this.downloadFolder)) {
            fs.mkdirSync(this.downloadFolder, { recursive: true });
          }
        
          // Full path to save PDF
          const filePath = path.join(this.downloadFolder, filename);
        
          // Save and return path
          await download.saveAs(filePath);
        
        //close message
        statementMessage.click();
        return filePath; 
    }

    async VerifyCASAStatement(pdfPath: string) {

        const receiptHelper = new ReceiptHelper(this.page);
        const pdfLines = await receiptHelper.readPdfData(pdfPath);
        const content = pdfLines.join(" ");
        return {
            accountNumber: await this.extractField(content, 'Account Number', ['Account Holder', 'Opening Balance']),
            dateOfStatement: await this.extractField(content, 'Date of Statement', ['Statement Period', 'Account Name']),
            statementPeriod: await this.extractField(content, 'Statement Period', ['Account Name']),
            accountName: await this.extractField(content, 'Account Name', ['Account Number', 'Account Holder']),
            accountHolder: await this.extractField(content, 'Account Holder', ['Opening Balance']),
            openingBalance: await this.extractField(content, 'Opening Balance:', ['Closing Balance']),
            closingBalance: await this.extractField(content, 'Closing Balance:', ['Number of Pages']),
            numberOfPages: await this.extractField(content, 'Number of Pages', ['Date', 'Remarks'])
        };
    }

    async extractField(contentText:string,fieldName: string, stopAt?: string[]) {
    // Build a regex that stops at next field or transactions
    const stopPattern = stopAt && stopAt.length ? stopAt.join('|') : '$';
    const regex = new RegExp(fieldName + '\\s*([\\s\\S]*?)(?=' + stopPattern + ')', 'i');
    const match = regex.exec(contentText);
    if (!match) return '';
   return match[1].trim().split(/\s+/).slice(0, 15).join(' '); // first few words
  
}
}


