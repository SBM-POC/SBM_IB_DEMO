// creditCardPayment.spec.ts
import { test, expect, chromium } from '@playwright/test';
import { readCsvData } from '../Utils/readCsvData';
import { updateCsvCell } from '../Utils/readCsvData';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { PayTransfer } from '../pages/PayTransferPage';
import { TransferFormData } from '../Utils/Types';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import * as allure from "allure-js-commons";
import { OtherSBMPage } from '../pages/OtherSBMPage';
import { ScheduledTransactionsPage } from '../pages/ScheduledTransactionsPage';
import { OtherLocalBankPage } from '../pages/LocalBankTransferPage';
import { PayTransferMenu } from '../pages/PayTransferMenu';
import { OwnBankTransferPage } from '../pages/OwnAccountTransferPage';

test('Check previous dates in Calendar ', (async ({ page }, testInfo) => {
    const loginPage = new LoginPage(page);
    const utilityLibraryPage = new utilityLibrary(page);
    const pay = new PayTransfer(page);


    await allure.step('Login', async () => {
        await loginPage.goto();
        await loginPage.login("adam", "welcome@32");
    });
    await allure.step('Navigate to Other SBM Account Transfer', async () => {
        await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
        await utilityLibraryPage.SelectSubMenu(page, 'Other SBM Account Transfer');
        await pay.navigation.clickPayBeneficiaryOnce();

    });
    await allure.step('Verify Previous Dates are disabled in Calendar on Other SBM Account Transfer Screen', async () => {
        await utilityLibraryPage.VerifyPreviousDatesDisabled();
    });
    await allure.step('Navigate to Own Account Transfers', async () => {
        await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
        await utilityLibraryPage.SelectSubMenu(page, 'Own Account Transfers');

    });
    await allure.step('Verify Previous Dates are disabled in Calendar on Own Account Transfers Screen', async () => {
        await utilityLibraryPage.VerifyPreviousDatesDisabled();
    });
    await allure.step('Navigate to Other Local Bank Transfer', async () => {
        await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
        await utilityLibraryPage.SelectSubMenu(page, 'Other Local Bank Transfer');
        await pay.navigation.clickPayBeneficiaryOnce();

    });
    await allure.step('Verify Previous Dates are disabled in Calendar on Other Local Bank Transfer Screen', async () => {
        await utilityLibraryPage.VerifyPreviousDatesDisabled();
    });
    await allure.step('Navigate to SWIFT Transfer', async () => {
        await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
        await utilityLibraryPage.SelectSubMenu(page, 'SWIFT Transfer');
        await pay.navigation.clickPayBeneficiaryOnce();

    });
    await allure.step('Verify Previous Dates are disabled in Calendar on SWIFT Transfer Screen', async () => {
        await utilityLibraryPage.VerifyPreviousDatesDisabled();
    });
}));


test.describe('Other SBM Account Transfer- Scheduled Transactions', () => {
    let actualRefID: string;

    const scenarios = readCsvData('TestData_OtherSBMTransfer_Scheduled.csv');
    for (const [index, row] of scenarios.entries()) {
        const scenarioLabel = row.Description?.replace(/\s+/g, ' ').trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

            test.setTimeout(300000);

            const loginPage = new LoginPage(page);
            const myAccount = new MyAccount(page);
            const pay = new PayTransfer(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);
            const otherSBMPage = new OtherSBMPage(page);
            const utilityLibraryPage = new utilityLibrary(page);
            const scheduledTransactionsPage = new ScheduledTransactionsPage(page);

            const data: TransferFormData = {
                senderNickname: row.Sender_Account_Nickname.trim(),
                senderAccount: row.Sender_Account?.trim(),
                amount: row.Amount?.trim(),
                toAccount: row.Recipient_Account?.trim(),
                remarks: row.Remarks?.trim(),
                currency: row.Transfer_Currency?.trim(),
                errMsgAmount: row.ErrMsg_Amount?.trim(),
                errMsgACNo: row.ErrMsg_AC_No?.trim(),
                errMsgRemarks: row.ErrMsg_Remarks?.trim(),
                errMsgSameAccount: row.ErrMsg_sameAccount?.trim(),
                exchangeRateType: row.ExchangeRateType?.trim(),
                paymentDate: row.TransferDate.trim()
            };

            const otp = row.OTP?.trim();
            try {
                await allure.step('Login and verify account', async () => {
                    await loginPage.goto();
                    await loginPage.login(row.Username, row.Password);
                    await myAccount.assertMyAccountTabActive();
                });

                await allure.step('Navigate to transfer section', async () => {
                    await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                    await utilityLibraryPage.SelectSubMenu(page, 'Other SBM Account Transfer');
                    await pay.navigation.clickPayBeneficiaryOnce();

                });

                await allure.step('Fill form and submit', async () => {
                    await pay.formHandler.fill(data);
                    await page.locator('button#save_or_pay_beneficiary').click();
                });

                await allure.step('Validate confirmation dialog details', async () => {
                    const actualPaymentDate = await utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate);
                    await pay.confirmationVerifier.verifyPleaseConfirmDialogDetailsNew(data.senderNickname, data.senderAccount, data.toAccount, data.currency, data.amount, actualPaymentDate, data.remarks);
                    await page.locator("xpath=//button[@id='BW_button_021029']").click();
                });
                await allure.step('Validate successful dialog details', async () => {
                    actualRefID = await pay.confirmationVerifier.verifySuccessfulDialogDetails(data.senderAccount, data.toAccount, data.amount, data.currency, data.remarks);
 
                    //write actualRefID to csv for further verification
                    updateCsvCell('TestData_OtherSBMTransfer_Scheduled.csv',(index+1),"eBankingRefID",actualRefID) 

                });
                await allure.step('Download receipt and verify receipt content', async () => {
                    const maskedFromAccount = await utilityLibraryPage.MaskedAccountNumber(data.senderAccount);
                    const maskedToAccount = await utilityLibraryPage.MaskedAccountNumber(data.toAccount);
                    const currentTransactionDate = await utilityLibraryPage.CalculateDateMonthDDYYYY("TODAY");                    
                    const calculatedFutureDate= await utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate)
                    const futurePaymentDate=await utilityLibraryPage.moveToNextWorkingDay_DDMonthYYYY(calculatedFutureDate)                    
                    await otherSBMPage.verifyReceiptData(maskedFromAccount, maskedToAccount, currentTransactionDate, data.amount, data.currency, data.remarks, actualRefID,futurePaymentDate);
                    await pay.dialog.close();

                });
                await allure.step('Verify transaction details in View Scheduled Transactions under Pay & Transfer', async () => {
                    await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                    await utilityLibraryPage.SelectSubMenu(page, 'Scheduled Transactions');
                    await utilityLibraryPage.selectDropdown(page, `//mat-label[contains(text(),'From Account')]/../../mat-select`, data.senderAccount);
                    const optionToSelect = await page.locator(`mat-option:has-text("${data.senderAccount}")`);
                    await optionToSelect.scrollIntoViewIfNeeded();
                    await optionToSelect.click();
                    await waitForSpinnerToDisappear(page);
                    const calculatedFutureDate= await utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate)
                    const futurePaymentDate=await utilityLibraryPage.moveToNextWorkingDay_DDMMYYYY(calculatedFutureDate)
                    await scheduledTransactionsPage.VerifyScheduledTransactionDetails(page,"Other SBM Transfer",futurePaymentDate,"Debit",data.currency,data.amount,data.remarks,data.toAccount);               
                });
                await allure.step('Verify transaction details in Scheduled Transactions in Accounts View', async () => {
                    await utilityLibraryPage.SelectTab(page, 'My Accounts');
                    await waitForSpinnerToDisappear(page);
                    await transactionHistoryPage.OpenTransactionHistoryScreen(page, data.senderAccount);
                    await transactionHistoryPage.scheduledTransactionsOption.click();
                    const calculatedFutureDate= await utilityLibraryPage.CalculateDateDDMMYYYY(data.paymentDate)
                    const futurePaymentDate=await utilityLibraryPage.moveToNextWorkingDay_DDMMYYYY(calculatedFutureDate)                                    
                    await scheduledTransactionsPage.VerifyScheduledTransactionDetails(page,"Other SBM Transfer",futurePaymentDate,"Debit",data.currency,data.amount,data.remarks,data.toAccount);               
                                    
                    //write futurePaymentDate to csv for further verification
                    updateCsvCell('TestData_OtherSBMTransfer_Scheduled.csv',(index+1),"PaymentDate",futurePaymentDate) 
                });
                await allure.step('Logout', async () => {
                    await myAccount.logout();
                });

            } catch (error) {
                console.error(`Scenario ${index + 1} FAILED: ${row.Description}`);
                console.error(error);
                testInfo.annotations.push({
                    type: 'error',
                    description: `Scenario ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`
                });
                throw error;
            }
        });
    }
});

test.describe('Other SBM Account Transfer - Verify Scheduled Transactions on Scheduled Date', () => {
    const scenarios = readCsvData('TestData_OtherSBMTransfer_Scheduled.csv');
    for (const [index, row] of scenarios.entries()) {
        const scenarioLabel = row.Description?.replace(/\s+/g, ' ').trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

            const utilityLibraryPage = new utilityLibrary(page);
            const loginPage = new LoginPage(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);
            const myAccount = new MyAccount(page);

            const paymentDate = row.PaymentDate.trim();
            const senderNickname= row.Sender_Account_Nickname.trim();
            const senderAccount= row.Sender_Account.trim();
            const amount= row.Amount.trim();
            const toAccount = row.Recipient_Account.trim();
            const remarks= row.Remarks.trim();
            const currency = row.Transfer_Currency.trim();
            const ebankingrefid = row.eBankingRefID.trim();

            try {
                const isTrue = await utilityLibraryPage.CheckifDateisToday(paymentDate);
                if (isTrue) {
                    await allure.step('Login and verify account', async () => {
                        await loginPage.goto();
                        await loginPage.login(row.Username, row.Password);
                        await myAccount.assertMyAccountTabActive();

                    });
                    await allure.step('Verify details in transaction history screen by ref ID', async () => {
                    await transactionHistoryPage.OpenTransactionHistoryScreen(page, senderAccount);
                    await transactionHistoryPage.ClickSearchTransactionHistory(page);
                    await transactionHistoryPage.SearchByReferenceID(page,ebankingrefid);
                    const actualPaymentDate = await utilityLibraryPage.CalculateDateMonthDDYYYY(paymentDate);
                    await transactionHistoryPage.VerifyTransactionDetails(page, actualPaymentDate,senderNickname , senderAccount, toAccount, amount, currency, remarks);
                    });

                    await allure.step('Verify details in calendar activity history for debit account', async () => {
                        await utilityLibraryPage.SelectTab(page, 'My Accounts');
                        await waitForSpinnerToDisappear(page);
                        await utilityLibraryPage.VerifyInCalendarActivity('debit', paymentDate, senderNickname, currency,amount,remarks);        
                    });
                }
                else {

                }

            } catch (error) {
                testInfo.annotations.push({
                    type: 'error',
                    description: `Scenario ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`
                });
                throw error;
            }


        });
    }
});

test.describe('Own Bank Account Transfer — Schedule Transactions', () => {
    let actualRefID: string;

    const scenarios = readCsvData('TestData_OwnBankTransfer_Scheduled.csv');
    for (const [index, row] of scenarios.entries()) {
        const scenarioLabel = row.Description?.replace(/\s+/g, ' ').trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

            const username= row.Username.trim();
            const password= row.Password.trim();
            const senderAccount= row.FromAccount.trim();
            const recipientAccount= row.ToAccount.trim();
            const amount= row.Amount.trim();
            const remarks= row.Remarks.trim();
            const currency= row.Currency.trim();
            const transactionDate= row.TransactionDate.trim();
            const scheduledTransactionsPage = new ScheduledTransactionsPage(page);

            const login = new LoginPage(page);
            const menu = new PayTransferMenu(page);
            const transfer = new OwnBankTransferPage(page);
            const myAccount = new MyAccount(page);
            const utilityLibraryPage = new utilityLibrary(page);
            const pay = new PayTransfer(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);

            // Open the app and sign in
            await test.step('Open login page', async () => {
                await login.goto();
            });

            await test.step('Login', async () => {
                await login.login(username,password);
            });


            const initialAvailableBal = await allure.step('Verify account', async () => {
                await myAccount.assertMyAccountTabActive();
                const  available = await utilityLibraryPage.CaptureBalance(page, senderAccount, "accountType");
                return available;

            })


            // Go to the “Own Account Transfers” screen
            await test.step('Navigate: Own Account Transfers', async () => {
                await menu.openAndSelect('Own Account Transfers');
            });

            // Fill the form using values from the CSV row
            await test.step('Fill form', async () => {
                const testDataUsed = `        
                          - From Account:'${senderAccount}'
                          - Amount:'${amount}'
                          - To Account:'${recipientAccount}'
                          - Remarks:'${remarks}';
                          - Currency: '${currency}'`;
                await allure.attachment("Test Data", testDataUsed, "text/plain");
                await transfer.selectFromAccount(senderAccount);
                await transfer.selectToAccount(recipientAccount);
                await transfer.selectCurrency(currency);
                await transfer.enterAmount(amount);
                await transfer.enterRemarks(remarks);
                await transfer.selectDate(transactionDate);
            });           

            // Continue to the confirmation screen
            await test.step('Click Transfer', async () => {
                await transfer.clickTransfer();
            });

            // Check that the confirmation screen reflects what we entered
            await test.step('Verification of Confirmation page', async () => {
                await transfer.expectConfirmFromAccountContains(senderAccount);
                await transfer.expectConfirmToAccountContains(recipientAccount);
                await transfer.expectConfirmAmountNumeric(amount);
                await transfer.expectConfirmRemarksEquals(remarks);
            });


            await test.step('Click Confirm', async () => {
                await transfer.clickConfirm();
            });
            // On the success screen, check key details again
            await test.step('Verfication of Transfer Successful page', async () => {
                await transfer.expectSuccessAmountNumeric(amount);
                await transfer.expectSuccessCurrencyEquals(currency);
                await transfer.expectSuccessToAccountContains(recipientAccount);
                await transfer.expectSuccessRemarksEquals(remarks);
                actualRefID = await transfer.getReferenceID();
                updateCsvCell('TestData_OwnBankTransfer_Scheduled.csv',(index+1),"eBankingRefID",actualRefID) 

            });
            await allure.step('Download receipt and verify receipt content', async () => {
                const maskedFromAccount = await utilityLibraryPage.MaskedAccountNumber(senderAccount);
                const maskedToAccount = await utilityLibraryPage.MaskedAccountNumber(recipientAccount);
                const currentTransactionDate = await utilityLibraryPage.CalculateDateMonthDDYYYY("TODAY");                    
                const calculatedFutureDate= await utilityLibraryPage.CalculateDateDDMMYYYY(transactionDate)
                const futurePaymentDate=await utilityLibraryPage.moveToNextWorkingDay_DDMonthYYYY(calculatedFutureDate)                                        
                await transfer.verifyReceiptData(maskedFromAccount, maskedToAccount, currentTransactionDate, amount, currency, remarks, actualRefID,futurePaymentDate);
                await pay.dialog.close();

            });
            await allure.step('Verify transaction details in View Scheduled Transactions under Pay & Transfer', async () => {
                await utilityLibraryPage.SelectTab(page, 'Pay & Transfer');
                await utilityLibraryPage.SelectSubMenu(page, 'Scheduled Transactions');
                await utilityLibraryPage.selectDropdown(page, `//mat-label[contains(text(),'From Account')]/../../mat-select`, senderAccount);
                const optionToSelect = await page.locator(`mat-option:has-text("${senderAccount}")`);
                await optionToSelect.scrollIntoViewIfNeeded();
                await optionToSelect.click();
                await waitForSpinnerToDisappear(page);
                const calculatedFutureDate= await utilityLibraryPage.CalculateDateDDMMYYYY(transactionDate)
                const futurePaymentDate=await utilityLibraryPage.moveToNextWorkingDay_DDMMYYYY(calculatedFutureDate)
                await scheduledTransactionsPage.VerifyScheduledTransactionDetails(page,"Other Local Bank Transfer",futurePaymentDate,"Debit",currency,amount,remarks,recipientAccount);               
            });
            await allure.step('Verify transaction details in Scheduled Transactions in Accounts View', async () => {
                await utilityLibraryPage.SelectTab(page, 'My Accounts');
                await waitForSpinnerToDisappear(page);
                await transactionHistoryPage.OpenTransactionHistoryScreen(page, senderAccount);
                await transactionHistoryPage.scheduledTransactionsOption.click();
                const calculatedFutureDate= await utilityLibraryPage.CalculateDateDDMMYYYY(transactionDate)
                const futurePaymentDate=await utilityLibraryPage.moveToNextWorkingDay_DDMMYYYY(calculatedFutureDate)                                    
                await scheduledTransactionsPage.VerifyScheduledTransactionDetails(page,"Other Local Bank Transfer",futurePaymentDate,"Debit",currency,amount,remarks,recipientAccount);               
                                
                //write futurePaymentDate to csv for further verification
                updateCsvCell('TestData_OwnBankTransfer_Scheduled.csv',(index+1),"PaymentDate",futurePaymentDate) 
            });
            await allure.step('Logout', async () => {
                await myAccount.logout();
            });
        });
    }
});

test.describe('Own Bank Account Transfer — Verify Scheduled Transactions on Scheduled Date', () => {
    let actualRefID: string;

    const scenarios = readCsvData('TestData_OwnBankTransfer_Scheduled.csv');
    for (const [index, row] of scenarios.entries()) {
        const scenarioLabel = row.Description?.replace(/\s+/g, ' ').trim();
        test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }, testInfo) => {

            const username= row.Username.trim();
            const password= row.Password.trim();
            const senderAccount= row.FromAccount.trim();
            const recipientAccount= row.ToAccount.trim();
            const amount= row.Amount.trim();
            const remarks= row.Remarks.trim();
            const currency= row.Currency.trim();
            const paymentDate= row.PaymentDate.trim();
            const scheduledTransactionsPage = new ScheduledTransactionsPage(page);

            const loginPage = new LoginPage(page);
            const menu = new PayTransferMenu(page);
            const transfer = new OwnBankTransferPage(page);
            const myAccount = new MyAccount(page);
            const utilityLibraryPage = new utilityLibrary(page);
            const pay = new PayTransfer(page);
            const transactionHistoryPage = new TransactionHistoryPage(page);
            const ebankingrefid = row.eBankingRefID.trim();

            try {
                const isTrue = await utilityLibraryPage.CheckifDateisToday(paymentDate);
                if (isTrue) {
                    await allure.step('Login and verify account', async () => {
                        await loginPage.goto();
                        await loginPage.login(username, password);
                        await myAccount.assertMyAccountTabActive();

                    });
                    await allure.step('Verify details in transaction history screen by ref ID', async () => {
                    await transactionHistoryPage.OpenTransactionHistoryScreen(page, senderAccount);
                    await transactionHistoryPage.ClickSearchTransactionHistory(page);
                    await transactionHistoryPage.SearchByReferenceID(page,ebankingrefid);
                    const actualPaymentDate = await utilityLibraryPage.CalculateDateMonthDDYYYY(paymentDate);
                    await transactionHistoryPage.VerifyTransactionDetails(page, actualPaymentDate,senderAccount , senderAccount, recipientAccount, amount, currency, remarks);
                    });

                    await allure.step('Verify details in calendar activity history for debit account', async () => {
                        await utilityLibraryPage.SelectTab(page, 'My Accounts');
                        await waitForSpinnerToDisappear(page);
                        await utilityLibraryPage.VerifyInCalendarActivity('debit', paymentDate, senderAccount, currency,amount,remarks);        
                    });
                }
                else {

                }

            } catch (error) {
                testInfo.annotations.push({
                    type: 'error',
                    description: `Scenario ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`
                });
                throw error;
            }
        });
    }
});
