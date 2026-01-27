import { test, expect, Page, Locator } from '@playwright/test';
import { CardsPage } from '../pages/CardsPage';
import type { CardDetails } from '../pages/CardsPage';
import { LoginPage } from '../pages/loginPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-playwright";
// ---------------------------------------------------
// Helper: Debug Card Selectors
// ---------------------------------------------------
async function debugCardSelectors(page: Page) {
  console.log("📌 Running selector diagnostics...");
  const selectors = [
    "mat-expansion-panel-header",
    ".mat-expansion-panel-header",
    "div[role='button'][aria-controls]",
    ".card-header",
    ".mat-expansion-panel .mat-content",
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel);
    const count = await loc.count();
    console.log(`Selector '${sel}' → found: ${count}`);
  }
  console.log("➡ Extracting raw header text...");
  const raw = page.locator("mat-expansion-panel-header");
  const rawCount = await raw.count();
  console.log(`🔥 RAW HEADERS FOUND: ${rawCount}`);
  for (let i = 0; i < rawCount; i++) {
    const t = (await raw.nth(i).innerText()).trim();
    console.log(`HEADER ${i}: ${t}`);
  }
}
// ---------------------------------------------------
// Helper: Navigate to Cards Page
// ---------------------------------------------------
async function navigateToCards(page: Page) {
  await test.step('Navigate to Cards Section', async () => {
    const cardsLink = page.locator('li#cards_hor > a.menu-link');
    await expect(cardsLink).toBeVisible({ timeout: 10000 });
    await cardsLink.click();
    await expect(page).toHaveURL(/\/cards$/, { timeout: 30000 });
  });
}
// ---------------------------------------------------
// Helper: Get ONLY real card headers
// ---------------------------------------------------
async function getRealCardHeaders(page: Page): Promise<Locator[]> {
  const allHeaders = page.locator('mat-expansion-panel-header');
  const count = await allHeaders.count();
  const realHeaders: Locator[] = [];
  for (let i = 0; i < count; i++) {
    const header = allHeaders.nth(i);
    const text = (await header.innerText()).trim();
    // Identify real card headers (skip placeholders)
    const isReal =
      text.includes("Debit Card") ||
      text.includes("Prepaid Card") ||
      (await header.locator('.card-name').count()) > 0;
    if (isReal) realHeaders.push(header);
  }
  console.log(`🔥 REAL card headers found: ${realHeaders.length}`);
  return realHeaders;
}
// ---------------------------------------------------
// Helper: Expand all REAL card panels
// ---------------------------------------------------
async function expandAllRealCards(page: Page): Promise<Locator[]> {
  const realHeaders = await getRealCardHeaders(page);
  for (let i = 0; i < realHeaders.length; i++) {
    const header = realHeaders[i];
    await header.scrollIntoViewIfNeeded();
    const expanded = await header.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      console.log(`Expanding real card ${i}`);
      await header.click();
      await page.waitForTimeout(300);
    }
  }
  return realHeaders;
}
// ---------------------------------------------------
// Helper: Toggle a card switch safely
// ---------------------------------------------------
async function toggleCardSwitch(card: Locator, ariaLabel?: string): Promise<string | null> {
  let toggle: Locator;
  if (ariaLabel) {
    toggle = card.locator(`button[role="switch"][aria-labelledby="${ariaLabel}"]`);
  } else {
    toggle = card.locator('button[role="switch"]');
  }
  if ((await toggle.count()) === 0) return null;
  const before = await toggle.getAttribute('aria-checked');
  await toggle.click();
  await card.page().waitForTimeout(400);
  const after = await toggle.getAttribute('aria-checked');
  return after;
}
// ---------------------------------------------------
// TEST SUITE
// ---------------------------------------------------

test.describe('Cards Tests (Refactored)', { tag: ['@E2E','@Cards','@SIA-53'] },() => {
    let loginPage: LoginPage;
    let cardsPage: CardsPage;

    test.beforeEach(async ({ page }) => {
        page.setDefaultTimeout(120_000);
        page.setDefaultNavigationTimeout(120_000);

        loginPage = new LoginPage(page);
        cardsPage = new CardsPage(page);

        await loginPage.goto();
        await loginPage.login('1598830', 'Test@1234');
        await cardsPage.gotoCards();
    });

    test('Verify Card Details', async ({ page }, testInfo) => {
        const headers = await cardsPage.expandAllRealCards();

        for (let i = 0; i < headers.length; i++) {
            const details: CardDetails = await cardsPage.getCardDetails(headers[i]);
            await testInfo.attach(`Card ${i + 1}`, {
                body: JSON.stringify(details, null, 2),
                contentType: 'application/json'
            });

            expect(details.name).not.toBe('');
            expect(details.number).toMatch(/\d{4}\*+\d{4}/);
            expect(details.expiry).toMatch(/\d{2}\/\d{2}/);
        }
    });

    test('Toggle Card Active On/Off', async ({ page }, testInfo) => {
        const headers = await cardsPage.expandAllRealCards();
        for (let i = 0; i < headers.length; i++) {
            const initialState = await cardsPage.toggleCard(headers[i]);
            await cardsPage.handleConfirmationDialog();
            const snackbar = await cardsPage.waitForSnackbar();
            await testInfo.attach(`Card ${i + 1} → Toggle Result`, {
                body: JSON.stringify({ initialState, snackbar }, null, 2),
                contentType: 'application/json'
            });
        }
    });

    test('Toggle eCommerce Settings', async ({ page }, testInfo) => {
        const headers = await cardsPage.expandAllRealCards();
        const firstCard = headers[0];
        const after = await cardsPage.toggleCard(firstCard, 'mat-slide-toggle#ecommerce-toggle button[role="switch"]');
        expect(after).toMatch(/true|false/);
    });

    test('Toggle Contactless Settings', async ({ page }, testInfo) => {
        const headers = await cardsPage.expandAllRealCards();
        for (let i = 0; i < headers.length; i++) {
            const after = await cardsPage.toggleCard(headers[i], 'mat-slide-toggle#tap-toggle button[role="switch"]');
            await cardsPage.handleConfirmationDialog();
            const snackbar = await cardsPage.waitForSnackbar();
            await testInfo.attach(`Card ${i + 1} → Contactless Toggle`, {
                body: JSON.stringify({ after, snackbar }, null, 2),
                contentType: 'application/json'
            });
        }
    });

    test('Reset Card PIN', async ({ page }, testInfo) => {
        const headers = await cardsPage.expandAllRealCards();

        for (let i = 0; i < headers.length; i++) {
            const dialog = await cardsPage.openResetPinDialog(headers[i]);
            if (!dialog) continue;

            // Fill PIN and confirm
            await cardsPage.fillPin(dialog, '4321', '4321');
            await cardsPage.cancelPinDialog(dialog);
        }
    });
});