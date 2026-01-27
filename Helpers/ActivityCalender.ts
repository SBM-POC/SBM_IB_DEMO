import { Page, expect } from '@playwright/test';
import { waitForSpinnerToDisappear } from '../Utils/WaitForSpinner';
import * as allure from "allure-js-commons";

export class ActivityCalenderHelper {

  constructor(private readonly page: Page) { }

  async expandAllPanelsForGroup(groupName: string, dateStr: string, accountName?: string) {
    const groupTitles = this.page.locator('.acc_group_title');
    const count = await groupTitles.count();
    console.log(`Found ${count} panels`);

    for (let i = 0; i < count; i++) {
      const title = await groupTitles.nth(i).innerText();
      if (title.trim().toUpperCase() === groupName.trim().toUpperCase()) {
        const groupContainer = groupTitles.nth(i).locator('..').locator('..');
        const panels = groupContainer.locator('mat-expansion-panel-header');
        const panelCount = await panels.count();

        for (let j = 0; j < panelCount; j++) {
          const panel = panels.nth(j);
          const expanded = await panel.getAttribute('aria-expanded');

          if (expanded !== 'true') {
            await panel.click();
            await this.page.waitForTimeout(5000);
          }

          const panelHeader = panel.locator('..');
          const bodyContent = panelHeader.locator('.mat-body-2');
          const captions = panel.locator('.mat-caption.text-truncate');
          const captionTexts = await captions.allInnerTexts();

          const isMatchingAccount = !accountName || captionTexts.some(c =>
            c.toUpperCase().includes(accountName.toUpperCase())
          );

          let dateAmountPairs: { date: string; amount: string }[] = [];

          if (isMatchingAccount) {
            const hasContent = await bodyContent.count();
            if (hasContent > 0) {
              const contentText = await bodyContent.allInnerTexts();
              const rawText = contentText.join(',');

              console.log('rawText:', rawText);

              const regex = /(\d{2}\/\d{2}\/\d{4}),\s*(-?\s*(?:-?\s*€\s)[\d,]+\.\d{2})/g;
              let match;

              while ((match = regex.exec(rawText)) !== null) {
                const date = match[1].trim();
                const amount = match[2].trim();
                dateAmountPairs.push({ date, amount });
              }

              const transactionDate = await bodyContent.first().innerHTML();

              console.log(`Panel ${j + 1} MATCHES account "${accountName}"`);
              console.log(`Transaction Date: ${transactionDate}`);
              console.log("Parsed Date & Amount Pairs:");
              for (const pair of dateAmountPairs) {
                console.log(`Date: ${pair.date}, Amount: ${pair.amount}`);
              }
              console.log(`Account Captions: ${captionTexts}`);
            } else {
              console.log(`Panel ${j + 1} has no '.mat-body-2' content.`);
            }
          } else {
            console.log(`Panel ${j + 1} skipped — does not match account: ${accountName}`);
          }

          // ==== Calendar Navigation ====

          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];

          const [dd, mm, yyyy] = dateStr.split('/').map(Number);
          const targetDate = new Date(yyyy, mm - 1, dd);
          const monthLabelLocator = this.page.locator('button.month-selector .mdc-button__label');

          const getCurrentMonthYear = async () => {
            const label = await monthLabelLocator.textContent();
            if (!label) throw new Error('Month label not found or empty');
            const [monthName, yearStr] = label.trim().split(' ');
            return {
              month: monthNames.indexOf(monthName),
              year: parseInt(yearStr, 10)
            };
          };

          let safetyCounter = 0;
          while (true) {
            const { month, year } = await getCurrentMonthYear();
            const current = new Date(year, month);

            if (
              current.getFullYear() === targetDate.getFullYear() &&
              current.getMonth() === targetDate.getMonth()
            ) {
              break;
            }

            if (current < targetDate) {
              await this.page.click('#next-month');
            } else {
              await this.page.click('#prev-month');
            }

            await this.page.waitForTimeout(300);

            safetyCounter++;
            if (safetyCounter > 24) throw new Error('Exceeded max month navigation attempts');
          }

          const dayLocator = this.page.locator('.mat-small.cal-day-number', {
            hasText: dd.toString(),
          }).filter({ hasText: dd.toString() });

          await dayLocator.first().click();

          const txns = await this.page.locator('app-activity-calendar-txn-container .activity-list').all();

          for (const txn of txns) {
            const type = await txn.locator('.txn-type').textContent().catch(() => null);
            const caption = await txn.locator('.mat-caption.text-truncate').textContent().catch(() => null);
            const subCaption = await txn.locator('.mat-small.text-truncate').textContent().catch(() => null);
            const amount = await txn.locator('app-amount').textContent().catch(() => null);

            console.log(`Acc: ${caption}`);
            console.log(`Acc detail: ${subCaption}`);
            console.log(`amount: ${amount}`);

            const extractNumber = (text: string | null): string => {
              if (!text) return '';
              return text.replace(/[^\d.]/g, '');
            };

            const subCaptionNumber = extractNumber(subCaption);

            const matches = captionTexts.some(captionText => {
              const captionNumber = extractNumber(captionText);
              return captionNumber === subCaptionNumber;
            });

            if (!matches) {
              console.warn(`Verification FAILED: No captionTexts match subCaption number (${subCaptionNumber})`);
            } else {
              console.log(`Verification PASSED: Found matching captionText for ${subCaptionNumber}`);
            }

            // === New Verification: Amount match for matching date ===
            const matchingAmountExists = dateAmountPairs.some(pair =>
              pair.date === dateStr && pair.amount.replace(/\s/g, '') === amount?.replace(/\s/g, '')
            );

            if (!matchingAmountExists) {
              console.warn(`Verification FAILED: No matching amount in dateAmountPairs for date ${dateStr} and amount ${amount}`);
            } else {
              console.log(`Verification PASSED: Found matching amount for date ${dateStr} and amount ${amount}`);
            }
          }
        }
      }
    }
  }

  async VerifyInTransactionHistoryPanel(debitOrcredit: string, dateStr: string, accountName: string, currency: string, amount: string, remarks: string, timeout = 15000) {
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
        dateStr,
        amountCurrencyFullForm,
        remarks
      ];

    console.log(searchTerms)

    await waitForSpinnerToDisappear(this.page);
    //expand account panel
    const currentAccountPanel = this.page.locator(`xpath=//mat-expansion-panel-header[contains(.,"${accountName}")]`);
    await currentAccountPanel.waitFor({ state: 'visible', timeout });
    await currentAccountPanel.click();

    //verify if panel opens
    await expect(currentAccountPanel).toHaveAttribute('aria-expanded', 'true');
    await waitForSpinnerToDisappear(this.page);

    //get list of transaction history details
    const captions = this.page.locator(`xpath=//mat-expansion-panel-header[contains(.,"${accountName}")]/following-sibling::div//mat-list-item`);
    const numberOfRows = await captions.count();
    let oneLine="";
    for (let i = 0; i < numberOfRows; i++) {

      const captionTexts = await captions.nth(i).allInnerTexts();  
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
    Transaction successfully found in account "${accountName}".
    Matched details:
      - Date: ${dateStr}
      - Amount: ${amountCurrencyFullForm}
      - Remarks: ${remarks}`;
      await allure.attachment("Transaction Match Details", successMessage, "text/plain");
      await expect(found).toBeTruthy();

    }
    else {
      const failMessage = `
        Transaction not found in account "${accountName}" in transaction history details.
        Expected:
        - Date: ${dateStr}
        - Amount: ${amountCurrencyFullForm}
        - Remarks: ${remarks}
        But none of the ${numberOfRows} rows matched.
        `;
      //await allure.attachment("Missing Transaction Details", failMessage, { contentType: "text/plain" });
      throw new Error(failMessage);
    }
    await currentAccountPanel.click();

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

    const calendarWidgetAccDdl = this.page.locator(`xpath=//app-activity-calendar-widget//app-activity-calendar//mat-select`);
    await calendarWidgetAccDdl.waitFor({ state: 'visible', timeout });
    await calendarWidgetAccDdl.click();
    const optionToSelect = await this.page.locator(`mat-option:has-text("${accountNickname}")`);
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
      // console.log(captionTexts)
      // if (searchTerms.every(term =>
      //   captionTexts.some(part => part.includes(term))
      // )) {
      //   found = true;
      //   break;
      // }
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