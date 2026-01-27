import { Page, Locator, expect } from '@playwright/test';
import * as allure from "allure-js-commons";
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';

// Temporary stubs for missing named exports
export const clickButton = async (...args: any[]) => {};
export const selectRadio = async (...args: any[]) => {};
export const inputText = async (...args: any[]) => {};
export const selectDropdown = async (...args: any[]) => {};

// Existing utilityLibrary class stays as-is
export class utilityLibrary {
  page: any;

  constructor(page: any) {
    this.page = page;
  }

    // Fill a text field
    async inputText(page: Page, fieldSelector: string, value: string) {

        await page.locator(fieldSelector).fill(value);
    }

    // Click a button or element
    async clickButton(page: Page, elementSelector: string) {
        await page.locator(elementSelector).click();
    }

    // Choose an option in the normal browser dropdown (<select>)
    async selectNative(page: Page, selectSelector: string, label: string) {
        await page.selectOption(selectSelector, { label });
    }

    // Pick an item from a fancy in-page menu (custom styled dropdown the app builds, not the browser’s default)
    async selectDropdown(page: Page, triggerSelector: string, optionText: string) {
        await page.click(triggerSelector);
        //await page.getByRole('option', { name: optionText, exact: true }).click();
    }

    // Select a radio button
    async selectRadio(page: Page, radioSelector: string) {
        await page.locator(radioSelector).check();
    }

    // Check if element is enabled
    async isEnabled(page: Page, elementSelector: string) {
        return page.locator(elementSelector).isEnabled();
    }

    // Check if element is disabled
    async isDisabled(page: Page, elementSelector: string) {
        return page.locator(elementSelector).isDisabled();
    }

    // Assert a field (by selector) is visible and enabled
    async isVisible(page: Page, elementLocator: Locator, elementName: string) {
        try {
            await expect(elementLocator).toBeVisible();
            await allure.attachment(`'${elementName}' is visible.`, "", { contentType: "text/plain" });
        }
        catch (error) {
            throw new Error(`'${elementName}' is not visible`);
        }
    }

    // Assert a field (by selector) is visible and enabled
    async VerifyFieldAvailable(page: Page, fieldSelector: string, timeout = 15000) {
        const field = page.locator(fieldSelector).first();
        await expect(field).toBeVisible({ timeout });
        await expect(field).toBeEnabled({ timeout });
    }

    // 1) VerifyDomMessage – assert a DOM element contains expected success text
    async VerifyDomSuccesfulMessage(page: Page, selector: string, expectedText: string, timeout = 15000) {
        try {
            const SuccesfulMessage = page.locator(selector).first();
            await SuccesfulMessage.waitFor({ state: 'visible', timeout });
            await expect(SuccesfulMessage).toContainText(expectedText, { timeout });
            await allure.attachment(`The expected value '${expectedText}' is visible`, "", { contentType: "text/plain" });
        }
        catch (error) {
            throw new Error(`The expected value '${expectedText}' is not visible`);
        }
    }

    // 2) VerifyInlineErrorMessage – assert inline/field error text
    async VerifyInlineErrorMessage(page: Page, selector: string, expectedText: string, timeout = 15000) {
        const InlineErrorMessage = page.locator(selector).first();
        await InlineErrorMessage.waitFor({ state: 'visible', timeout });
        await expect(InlineErrorMessage).toContainText(expectedText, { timeout });
    }

    // 3) VerifyPopupErrorMessage – assert error text in overlays (dialogs/snackbars/toasts)
    async VerifyPopupErrorMessage(page: Page, expectedText: string, timeout = 15000) {
        const overlay = page.locator('.cdk-overlay-container');
        await overlay.waitFor({ state: 'visible', timeout });
        const msg = overlay.getByText(expectedText, { exact: false }).first();
        await expect(msg).toBeVisible({ timeout });
    }

    // 4) getPopupMessageText – returns the inner text from a popup message (e.g., snackbar/toast/dialog)
    async getPopupMessageText(page: Page, timeout = 15000): Promise<string> {
        const overlay = page.locator('.cdk-overlay-container');
        await overlay.waitFor({ state: 'visible', timeout });

        const message = overlay.locator('div, span, p').first(); // Adjust tag if needed
        await message.waitFor({ state: 'visible', timeout });

        return await message.innerText();
    }

    async isElementVisible(fieldSelector: Locator, fieldName: string, fieldValue: string) {
        try {
            await expect(fieldSelector).toBeVisible();
            await allure.attachment(`The field '${fieldName}' with value '${fieldValue}' is visible`, "", { contentType: "text/plain" });
        }
        catch (error) {
            throw new Error(`The field '${fieldName}' with value '${fieldValue}' is not visible.`);
        }
    }

    async SelectTab(page: Page, tabName: string, timeout = 15000) {
        switch (tabName) {
            case "My Accounts":
                const myaccTab = await page.locator(`xpath=//app-nav-bar//li[contains(@id,'retail-home_hor')]//a//span[contains(text(),'My Accounts')]`);
                await myaccTab.waitFor({ state: 'visible' });
                await myaccTab.click();
                await waitForSpinnerToDisappear(page);               
                await page.locator(`xpath=//h1[contains(normalize-space(.),'Dashboard')]`).waitFor({ state: 'visible', timeout});
                break;
            case "Pay & Transfer":
                const payTransferTab = await page.locator(`xpath=//app-nav-bar//li[contains(@id,'TRANSACTIONS_hor')]//a//span[contains(text(),'Pay & Transfer')]`);
                await payTransferTab.waitFor({ state: 'visible' });
                await payTransferTab.click();
                await waitForSpinnerToDisappear(page);
                await page.locator(`xpath= //app-nav-bar//li[contains(@id,'TRANSACTIONS_hor')]//ul[contains(@class,'sub-menu')]`).waitFor({ state: 'visible' });
                break;
            case "Service Request":
            const serviceReqTab = await page.locator(`xpath=//app-nav-bar//li[contains(@id,'SERVICE_REQUEST_hor')]//a//span[contains(text(),'Service Request')]`);
            await serviceReqTab.waitFor({ state: 'visible' });
            await serviceReqTab.click();
            await waitForSpinnerToDisappear(page);
            await page.locator(`xpath= //app-nav-bar//li[contains(@id,'SERVICE_REQUEST_hor')]//ul[contains(@class,'sub-menu')]`).waitFor({ state: 'visible' });
            break;
            case "Settings":
                const settingsTab = await page.locator(`xpath=//app-nav-bar//li[contains(@id,'SETTINGS_hor')]`);
                await settingsTab.waitFor({ state: 'visible' });
                await settingsTab.click();
                await waitForSpinnerToDisappear(page);
                await page.locator(`xpath= //app-nav-bar//li[contains(@id,'SETTINGS_hor')]//ul[contains(@class,'sub-menu')]`).waitFor({ state: 'visible' });
            break;
        }
    }

    async SelectSubMenu(page: Page, subMenu: string) {
        switch (subMenu) {
            case "Other SBM Account Transfer":
                const otherSBMAcc = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='3rdpartyInsideBank_hor']//a`);
                await otherSBMAcc.waitFor({ state: 'visible' });
                await otherSBMAcc.click();
                await page.locator(`xpath=//h3[contains(text(),'Other SBM Account Transfer')]`).waitFor({ state: 'visible' });
                break;
            case "Own Account Transfers":
                const ownAcc = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='fundstransfer_hor']//a`);
                await ownAcc.waitFor({ state: 'visible' });
                await ownAcc.click();
                await page.locator(`xpath=//h3[contains(text(),'Transfer Funds Between Accounts')]`).waitFor({ state: 'visible' });
                break;
            case "Other Local Bank Transfer":
                const otherLocalBank = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='3rdpartyInside_hor']//a`);
                await otherLocalBank.waitFor({ state: 'visible' });
                await otherLocalBank.click();
                await page.locator(`xpath=//h3[contains(text(),'Other Local Bank Transfer')]`).waitFor({ state: 'visible' });
                break;
            case "SWIFT Transfer":
                const swiftTransfer = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='3rdpartyInternational_hor']//a`);
                await swiftTransfer.waitFor({ state: 'visible' });
                await swiftTransfer.click();
                await page.locator(`xpath=//h3[contains(text(),'SWIFT Transfer')]`).waitFor({ state: 'visible' });
                break;
            case "Pay Own Credit Card":
                const ownCreditCard = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='creditCardPayment_hor']//a`);
                await ownCreditCard.waitFor({ state: 'visible' });
                await ownCreditCard.click();
                await page.locator(`xpath=//h3[contains(text(),'Pay Own Credit Card')]`).waitFor({ state: 'visible' });
                break;
            case "Pay To Mobile":
                const payToMobile = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='sendMoney_hor']//a`);
                await payToMobile.waitFor({ state: 'visible' });
                await payToMobile.click();
                await page.locator(`xpath=//h3[contains(text(),'Pay to Mobile')]`).waitFor({ state: 'visible' });
                break;
            case "Scheduled Transactions":
                const scheduledTransactions = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='scheduled-transactions_hor']//a`);
                await scheduledTransactions.waitFor({ state: 'visible' });
                await scheduledTransactions.click();
                await page.locator(`xpath=//h3[contains(text(),'Scheduled Transactions')]`).waitFor({ state: 'visible' });
                break; 
                        
            case "Request Cheque Book":
                const newChequeBook = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='cheque-book-request_hor']//a`);
                await newChequeBook.waitFor({ state: 'visible' });
                await newChequeBook.click();
                await page.locator(`xpath=//h3[contains(text(),'Cheque Book Request')]`).waitFor({ state: 'visible' });
                break;    
            case "Profile Settings":
                const profileSettings = await page.locator(`xpath=//ul[contains(@class,'sub-menu')]//li[@id='profile_hor']//a`);
                await profileSettings.waitFor({ state: 'visible' });
                await profileSettings.click();
                await page.locator(`xpath=//h3[contains(text(),'Profile Settings')]`).waitFor({ state: 'visible' });
                break;      
            }
    }

async CaptureBalance(page: Page, account: string, sectionTitle = 'Current and Saving', timeout = 15000) {
  const acc = account.replace(/'/g, '').trim();
  const balText= await page.locator(`xpath=//div[@class='mat-subtitle'][text()='${acc}']//following-sibling::div//app-amount`).innerText();
  const bal = await this.extractAmount(balText);
  return bal;
}




    async extractAmount(value: string): Promise<number> {
        // replace non-breaking spaces (and other unicode spaces) with regular spaces
        const normalized = value.replace(/\u00A0/g, ' ').trim();

        // remove any currency code or letters (everything up to first digit, for example)
        // then remove commas (thousands separators) if present
        const cleaned = normalized
            .replace(/^[^\d\-\+]+/, '')   // drop leading non-digits (including letters, currency code)
            .replace(/,/g, '')             // remove commas used as thousand separators
            ;

        // parse float
        const num = parseFloat(cleaned);
        if (isNaN(num)) {
            throw new Error(`Unable to parse numeric amount from string: "${value}"`);
        }
        return parseFloat(num.toFixed(2));
    }
    async CalculateAmountExchangeRate(exchangeRateType: string,exchangeRate:number,amount:string): Promise<number>
    {
        const amountFloat= parseFloat(amount);
        if (exchangeRateType.toLowerCase().trim() === "buy")
        {
        return parseFloat(((1 / exchangeRate) * amountFloat).toFixed(2));
        }
                
        if (exchangeRateType.toLowerCase().trim() === "sell")
        {
        return parseFloat((amountFloat * exchangeRate).toFixed(2));
        }
            
        throw new Error(`Invalid exchange rate type: '${exchangeRateType}'. Must be 'buy' or 'sell'.`);

    }

    async DeductAmount(initialAmount: number, finalAmount: number): Promise<number> {
        const difference = initialAmount - finalAmount;
        return parseFloat(difference.toFixed(2));
    }

 async VerifyExpectedActual(expectedValue: string, actualVal: string) {
  const toNum = (v: string) => Number(v.replace(/,/g, '').trim());

  const exp = toNum(expectedValue);
  const act = toNum(actualVal);

  // fallback to string compare if not numeric
  if (Number.isNaN(exp) || Number.isNaN(act)) {
    await expect(actualVal.trim()).toBe(expectedValue.trim());
    await allure.attachment(
      "VerifyExpectedActual - PASS",
      `Expected=${expectedValue.trim()} | Actual=${actualVal.trim()}`,
      "text/plain"
    );
    return;
  }

  const exp2 = exp.toFixed(2);
  const act2 = act.toFixed(2);

  try {
    await expect(act2).toBe(exp2);

    // ✅ Allure attachment on success (as requested)
    await allure.attachment(
      "VerifyExpectedActual - PASS",
      `Expected=${exp2} | Actual=${act2}`,
      "text/plain"
    );
  } catch {
    await allure.attachment(
      "VerifyExpectedActual - FAIL",
      `Expected=${exp2} | Actual=${act2} | RawExpected=${expectedValue} | RawActual=${actualVal}`,
      "text/plain"
    );
    throw new Error(`The expected value '${exp2}' does not match the actual value '${act2}'.`);
  }
}



    async isPresentOnDashboard(page: Page, accountType: string, accountNum: string, screen: string) {
        const expectedValueLocator = await page.locator(`xpath=//app-table-account-item//div[contains(text(),'${accountNum}')]/../preceding-sibling::div[@class='acc-name']//a[contains(text(),'${accountType}')]`);

        //add code to check balance is present
        try {
            await expect(expectedValueLocator).toBeVisible();
            await allure.attachment(`'${accountNum}' is visible on '${screen}' screen.`, "", { contentType: "text/plain" });
        }
        catch (error) {
            throw new Error(`'${accountNum}' is not visible on '${screen}'.`);
        }
    }
    async isNotPresentOnDashboard(page: Page, accountType: string, accountNum: string, screen: string) {
        const expectedValueLocator = await page.locator(`xpath=//app-table-account-item//div[contains(text(),'${accountNum}')]/../preceding-sibling::div[@class='acc-name']//a[contains(text(),'${accountType}')]`);
        //add code to check balance is present
        try {
            await expect(expectedValueLocator).not.toBeVisible();
            await allure.attachment(`'${accountNum}' is not visible on '${screen}' screen.`, "", { contentType: "text/plain" });
        }
        catch (error) {
            throw new Error(`'${accountNum}' is visible on '${screen}'.`);
        }
    }

    async MaskedAccountNumber(accountNumber: string) {
        if (accountNumber.length <= 8) return "*".repeat(accountNumber.length);

        const start = accountNumber.slice(0, 4);
        const end = accountNumber.slice(-4);
        const masked = "*".repeat(accountNumber.length - 8);

        return start + masked + end;
    }

    async CalculateDateDDMMYYYY(dateVal: string) {
        const today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        let formattedDate = "";
        if (dateVal.toLowerCase() === 'today') {
            formattedDate = `${dd}/${mm}/${yyyy}`;
        }
        if (dateVal.toLowerCase() === 'today+1') {
            dd=String(today.getDate()+1)
            formattedDate = `${dd}/${mm}/${yyyy}`;
        }
        if (dateVal.toLowerCase() === 'today+2') {
            dd=String(today.getDate()+2)
            formattedDate = `${dd}/${mm}/${yyyy}`;
        }
        return formattedDate;
    }

    async moveToNextWorkingDay_DDMMYYYY(formattedDate: string) {

        const [dd, mm, yyyy] = formattedDate.split("/").map(Number);

        if (!dd || !mm || !yyyy) {
            throw new Error("Invalid date format. Use DD/MM/YYYY.");
        }

        // Construct in local time and set to midday to avoid DST edge cases
        const date = new Date(yyyy, mm - 1, dd, 12);
        const result = new Date(date);

        // Advance until it's a weekday (Mon–Fri)
        while (result.getDay() === 0 || result.getDay() === 6) {
            result.setDate(result.getDate() + 1);
        }
        // Format as dd/mm/yyyy
        const day = String(result.getDate()).padStart(2, "0");
        const month = String(result.getMonth() + 1).padStart(2, "0");
        const year = result.getFullYear();

        return `${day}/${month}/${year}`;

    }

    async moveToNextWorkingDay_DDMonthYYYY(formattedDate: string) {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];


        const [dd, mm, yyyy] = formattedDate.split("/").map(Number);

        if (!dd || !mm || !yyyy) {
            throw new Error("Invalid date format. Use DD/MM/YYYY.");
        }

        // Construct in local time and set to midday to avoid DST edge cases
        const date = new Date(yyyy, mm - 1, dd, 12);
        const result = new Date(date);

        // Advance until it's a weekday (Mon–Fri)
        while (result.getDay() === 0 || result.getDay() === 6) {
            result.setDate(result.getDate() + 1);
        }
        // Format as dd/mm/yyyy
        const day = String(result.getDate()).padStart(2, "0");
        const month = monthNames[result.getMonth()];

        const year = result.getFullYear();

        return `${day} ${month} ${year}`;

    }

    async CalculateDateMMDDYYYY(dateVal: string) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        let formattedDate = "";
        if (dateVal.toLocaleLowerCase() === 'today') {
            formattedDate = `${mm}/${dd}/${yyyy}`;
        }
        return formattedDate;
    }

    async CalculateDateMonthDDYYYY(dateVal: string) {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const today = new Date();
        const yyyy = today.getFullYear();

        let formattedDate = "";
        if (dateVal.toLocaleLowerCase() === 'today') {
            const dd = String(today.getDate()).padStart(2, '0');
            const month = today.toLocaleString('default', { month: 'long' });
            formattedDate = `${dd} ${month} ${yyyy}`;
        }
        else {
            const [day, month, year] = dateVal.split('/').map(Number);
            const monthStr = monthNames[month - 1]
            formattedDate = `${day} ${monthStr} ${year}`;
        }
        return formattedDate;
    }

    async CheckAccountInDropdown(page: Page, dropdownLocator: Locator, accountNum: string, timeout = 10000) {
        await dropdownLocator.click();
        await page.locator(`xpath=//div[contains(@id,'overlay')]`).waitFor({ state: 'visible', timeout });

        const expectedAccValLocator = await page.locator(`xpath=//div[contains(@id,'overlay')]//mat-option//p[contains(@class,'acc-number')][contains(text(),'${accountNum}')]`);
        try {
            await expect(expectedAccValLocator).toBeVisible();
            await allure.attachment(`'${accountNum}' is present in the 'From Account' List and is allowed to perform transaction`, "", { contentType: "text/plain" });
        }
        catch (error) {
            throw new Error(`[FAILED] - '${accountNum}' is not present in the 'From Account' List.`);
        }
    }
    async CheckAccountNotInDropdown(page: Page, dropdownLocator: Locator, accountNum: string, timeout = 10000) {
        await dropdownLocator.click();
        await page.locator(`xpath=//div[contains(@id,'overlay')]`).waitFor({ state: 'visible', timeout });

        const expectedAccValLocator = await page.locator(`xpath=//div[contains(@id,'overlay')]//mat-option//p[contains(@class,'acc-number')][contains(text(),'${accountNum}')]`);
        try {
            await expect(expectedAccValLocator).not.toBeVisible();
            await allure.attachment(`'${accountNum}' is not present in the 'From Account' List and is not allowed to perform transaction`, "", { contentType: "text/plain" });
        }
        catch (error) {
            throw new Error(`[FAILED] - '${accountNum}' is present in the 'From Account' List.`);
        }
    }

    async RetrieveExchangeRate(page: Page, currency: string, rateType: string, timeout = 10000) :Promise <number> {
        await page.locator(`xpath=//button[contains(@id,'fx_rates')]`).waitFor({ state: 'visible', timeout });
        await page.locator(`xpath=//button[contains(@id,'fx_rates')]`).click();
        await waitForSpinnerToDisappear(page);
        await page.locator('app-fx-rates-container.fx-rates-container-wrapper').waitFor({ state: 'visible', timeout });

        const rows = await page.locator('table#tableGtXs tbody.mdc-data-table__content tr');
        const rowCount = await rows.count();

        //const exchangeRates = [];
        let finalRate = "";

        for (let i = 0; i < rowCount; i++) {
            const row = rows.nth(i);

            await row.locator('td.cdk-column-id').waitFor({ state: 'visible', timeout });
            await row.locator('td.cdk-column-spotbuyrate').waitFor({ state: 'visible', timeout });
            await row.locator('td.cdk-column-spotsellrate').waitFor({ state: 'visible', timeout });

            const currencyCode = (await row.locator('td.cdk-column-id').innerText()).trim();

            if (currencyCode.toLowerCase() !== currency.toLowerCase()) {
                continue; // skip other rows
            }
            if (rateType.trim().toLowerCase() === "buy") {
                finalRate = (await row.locator('td.cdk-column-spotbuyrate').innerText()).trim();
                break;

            }
            if (rateType.trim().toLowerCase() === "sell") {
                finalRate = (await row.locator('td.cdk-column-spotsellrate').innerText()).trim();
                break;
            }
        }
        return  Number(parseFloat(finalRate).toFixed(2))
    }

    async CheckifDateisToday(dateStr: string): Promise<boolean> {
        const [day, month, year] = dateStr.split('/').map(Number);
        const inputDate = new Date(year, month - 1, day); // JS months are 0-based
        const today = new Date();

        return (
            inputDate.getDate() === today.getDate() &&
            inputDate.getMonth() === today.getMonth() &&
            inputDate.getFullYear() === today.getFullYear()
        );

    }
    async SelectDateInCalendar(dateField:Locator,transactionDate: string): Promise<void> {
    const [targetDay, mm, targetYear] = transactionDate.split('/');

    // Open the calendar
    await dateField.click();
    await dateField.waitFor({ state: 'visible' });
    const monthNames = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
    const targetMonthInt = parseInt(mm, 10)-1;
    const targetMonthStr = monthNames[targetMonthInt];
    const targetMonthYear= targetMonthStr+' '+targetYear

    let actualMonthYearLabel = (await this.page.locator(`xpath=//mat-datepicker-content//label[contains(@id,'mat-calendar-header')]`).innerText()).trim();

    //added
    const parseMonthYear = (label: string) => {
        const [monthStr, yearStr] = label.split(' ');
        return {
            month: monthNames.indexOf(monthStr),
            year: parseInt(yearStr, 10)
        };
    };

    const target = parseMonthYear(targetMonthYear);

    let safetyCounter = 0;

      while (actualMonthYearLabel !== targetMonthYear) {            
        const current = parseMonthYear(actualMonthYearLabel);
        // If current is AFTER target → click previous
        if (current.year > target.year || 
            (current.year === target.year && current.month > target.month)) {
        await this.page.locator(`xpath=//button[contains(@class,'mat-calendar-previous-button')]`).click();   
        }
        // If current is BEFORE target → click next
        else {
        await this.page.locator(`xpath=//button[contains(@class,'mat-calendar-next-button')]`).click();   
        }

        actualMonthYearLabel = (await this.page.locator("//mat-datepicker-content//label[contains(@id,'mat-calendar-header')]").innerText()).trim();
        safetyCounter++;


        // await this.page.locator(`xpath=//button[contains(@class,'mat-calendar-next-button')]`).click();   
        // actualMonthYearLabel = (await this.page.locator(`xpath=//mat-datepicker-content//label[contains(@id,'mat-calendar-header')]`).innerText()).trim();   
        // safetyCounter++;
      }
      await this.page.locator(`xpath=//mat-datepicker-content//button[contains(@class,'mat-calendar-body-cell')]//span[normalize-space(text()) = '${String(parseInt(targetDay, 10))}']`).click();
      await this.page.locator(`xpath=//mat-datepicker-content//button[contains(@class,'mat-calendar-period')]`).waitFor({ state: 'hidden' });

    } 
      
    async VerifyPreviousDatesDisabled(): Promise<void> {

    const today = new Date();
    const currentDay = String(today.getDate()).padStart(2, '0');

    // Open the calendar
    await this.page.locator(`xpath=//button//mat-icon[contains(@id,'datepicker-icon')]`).click();
    await this.page.locator(`xpath=//mat-datepicker-content//button[contains(@class,'mat-calendar-period')]`).waitFor({ state: 'visible' });


    // Check that all past dates are disabled
    for (let i = (parseInt(currentDay) - 1); i >= 1; i--) {
      try {

        await expect(this.page.locator(`xpath=(//mat-datepicker-content//button[contains(@class,'mat-calendar-body-cell')])[${i}]`)).toHaveAttribute('aria-disabled', 'true');
        await allure.attachment(`[SUCCESS] Date '${i} ${(await this.page.locator(`xpath=//mat-datepicker-content//label[contains(@id,'mat-calendar-header')]`).innerText()).trim()}' is disabled in calendar.`, "", { contentType: "text/plain" });
      }
      catch (error) {
        throw new Error(`[FAILED] Date '${i} ${(await this.page.locator(`xpath=//mat-datepicker-content//label[contains(@id,'mat-calendar-header')]`).innerText()).trim()}' is not disabled in calendar.`);
      }

    }
  }
  async parseDate(dateStr: string): Promise<Date> {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}
async GetTextFieldValue(page: Page, elementLocator: Locator): Promise<string> {
    try {
        // Wait for element to be visible
        await elementLocator.waitFor({ state: 'visible', timeout: 5000 });
        // Otherwise → get visible text
        const text = await elementLocator.inputValue();
        return text.trim();

    } catch (error) {
        throw new Error(`Unable to retrieve text value from element. ${error}`);
    }
}
 async VerifyInCalendarActivity(debitOrcredit: string, dateStr: string, accountNickname: string, currency: string, amount: string, remarks: string, timeout = 15000) {
    let found = false;
    let debitSign = "";
    let currencyShortForm: string;
    if (debitOrcredit.toLowerCase() === "debit") {
      debitSign = "-";
    }
    if (currency === "EUR") {
      currencyShortForm = "€";
    }
    else {
      currencyShortForm = currency;
    }

    const amountCurrencyFullForm = debitSign + " " + currencyShortForm + " " + amount
    const searchTerms =
      [
        accountNickname,
        amountCurrencyFullForm,
        remarks
      ];

    const calendarWidgetAccDdl = this.page.locator(`xpath=//app-activity-calendar//mat-select`);
    await calendarWidgetAccDdl.waitFor({ state: 'visible', timeout });
    await calendarWidgetAccDdl.click();
    const optionToSelect = await this.page.locator(`mat-option span:has-text("${accountNickname}")`);
    await optionToSelect.scrollIntoViewIfNeeded();
    await optionToSelect.click();

    //select date
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    //checking the current date month year in calendar on application
    const [dd, mm, yyyy] = dateStr.split('/');
    const monthLabelLocator = this.page.locator('button.month-selector .mdc-button__label');
    var currentSelectedMonthYear = await monthLabelLocator.innerText();
    const [currentSelectedMonth, currentSelectedyear] = currentSelectedMonthYear.toString().split(' ');
    const currentYear = parseInt(currentSelectedyear, 10);
    const currentMonth = monthNames.indexOf(currentSelectedMonth);



    //retrieving the expected date month year
    const targetDay = parseInt(dd, 10);
    const targetMonthStr = monthNames[parseInt(mm, 10) - 1];
    const targetMonthInt = parseInt(mm, 10);
    const targetYear = parseInt(yyyy, 10);

    let safetyCounter = 0;
    while (true) {
      if (targetYear === currentYear && targetMonthStr === currentSelectedMonth) {
        break;
      }
      else if (targetYear < currentYear || (targetYear === currentYear && (targetMonthInt) < (currentMonth + 1))) {
        await this.page.click('#prev-month');
        await waitForSpinnerToDisappear(this.page);
        const getMonthYearText = await monthLabelLocator.innerText();
        if (getMonthYearText.includes(targetMonthStr) && getMonthYearText.includes(yyyy)) {
          break;
        }
      }
      else {
        await this.page.click('#next-month');
        await waitForSpinnerToDisappear(this.page);
        const getMonthYearText = await monthLabelLocator.innerText();
        if (getMonthYearText.includes(targetMonthStr) && getMonthYearText.includes(yyyy)) {
          break;
        }
      }
      safetyCounter++;
    }

    //Check if date is selected successfully
    const fullDate = dd + " " + targetMonthStr + " " + yyyy
    const dayLocator = this.page.locator(`xpath=//*[contains(@class, "mat-small") and contains(@class, "cal-day-number") and normalize-space(text())='${targetDay}']`);
    await dayLocator.first().click();
    await this.page
      .locator(`app-activity-calendar .activity-list-header`)
      .filter({ hasText: fullDate })
      .waitFor({ state: 'visible', timeout });

    const allTransactions = await this.page.locator('app-activity-calendar-txn-container .activity-list').all();

    for (const txn of allTransactions) {

      const captionTexts = await txn.allInnerTexts(); 
      const oneLine = captionTexts[0].split('\n').join(' ');
        const normalize = (str: string): string => str
          .replace(/\s+/g, ' ')
          .replace(/\u00A0/g, ' ')
          .trim()
          .toLowerCase();

        const oneLineNorm = normalize(oneLine);
        const searchTermsNorm = searchTerms.map(normalize);
        const isFound = searchTermsNorm.every(term => oneLineNorm.includes(term));
        if (isFound) {
          found = true;
          break;
        }


    }
    if (found) {
      const successMessage = `
            Transaction successfully found for account "${accountNickname}".
            Matched details:
              - AccountNickname: ${accountNickname}
              - Amount: ${debitSign} ${currencyShortForm} ${amount}
              - Remarks: ${remarks}`;
      await allure.attachment("Transaction Match Details in Calendar", successMessage, "text/plain");
      await expect(found).toBeTruthy();

    }
    else {
      const failMessage = `
                Transaction not found for account "${accountNickname}" in Calendar.
                Expected:
                - AccountNickname: ${accountNickname}
                - Amount: ${debitSign} ${currencyShortForm} ${amount}
                - Remarks: ${remarks}
                But none of the ${allTransactions.length} rows matched.
                `;
      //await allure.attachment("Missing Transaction Details", failMessage, { contentType: "text/plain" });
      throw new Error(failMessage);
    }

  }
}









