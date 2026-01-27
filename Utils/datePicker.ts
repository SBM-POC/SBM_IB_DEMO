import { Page } from "@playwright/test";

export async function selectDateFromCalendar(
    page: Page,
    dateInputLocator: string,
    targetDate: Date
) {
    // 1. Open the datepicker
    await page.locator(dateInputLocator).click();

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.toLocaleString("default", { month: "long" }); // e.g. November
    const targetDay = targetDate.getDate().toString();

    // 2. Open year/month selector if needed (common for Angular Material)
    const calendarHeader = page.locator("mat-calendar-header");
    await calendarHeader.click(); // switches to year view

    // 3. Select the year
    await page.locator('text=${targetYear}').click();

    // 4. Select the month
    await page.locator('text=${targetMonth}').click();

    // 5. Select the day
    // Many datepickers use button or div for days
    await page.locator('.mat-calendar-body-cell-content:text-is("${targetDay}")').click();
}