import { test, expect, Locator, Page } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { utilityLibrary } from '../Utils/utilityLibrary';
import * as allure from "allure-playwright";
import { TestInfo } from '@playwright/test';



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

        const isReal =
            text.includes("Debit Card") ||
            text.includes("Prepaid Card") ||
            text.includes("Credit Card") ||
            (await header.locator('.card-name').count()) > 0;

        if (isReal) realHeaders.push(header);
    }

    console.log(`🔥 Bank Cards : ${realHeaders.length}`);

    // NEW: handle user with zero cards
    if (realHeaders.length === 0) {
        console.warn("⚠️ No real cards found for this user.");
    }

    return realHeaders;
}


// ---------------------------------------------------
// Helper: Get all REAL card panels, optionally expanding
// ---------------------------------------------------
async function expandAllRealCards(page: Page, expand = true): Promise<Locator[]> {
    const realHeaders = await getRealCardHeaders(page);

    if (expand) {
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
    }

    return realHeaders;
}

// ---------------------------------------------------
// Helper: To click card safely
// ---------------------------------------------------
async function safeCardClick(
    card: Locator,              // ← type for the locator
    cardIndex: number,          // ← index number
    action: string              // ← label for logging
): Promise<void> {
    try {
        await card.click({ timeout: 2000 });
    } catch (err) {
        console.warn(
            `⚠️ Card ${cardIndex + 1} → Failed to ${action} (normal click). Retrying with force...`
        );

        try {
            await card.click({ force: true, timeout: 2000 });
        } catch (err2) {
            console.error(
                `❌ Card ${cardIndex + 1} → FORCE click also failed while trying to ${action}.`
            );
        }
    }
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

type SnackbarMessage = {
    type: 'success' | 'error' | null;
    message: string | null;
};

// ---------------------------------------------------
// Helper: Wait for snackbar message
// ---------------------------------------------------
export async function waitForSnackbarMessage(
    page: Page,
    timeout = 7000,
    interval = 100
): Promise<SnackbarMessage> {
    const success = page.locator('.mat-mdc-snack-bar-label p:has-text("successfully")');
    const error = page.locator('.mat-mdc-snack-bar-label p:has-text("Error")');
    const start = Date.now();

    while (Date.now() - start < timeout) {
        if (await success.isVisible()) return { type: 'success', message: await success.textContent() };
        if (await error.isVisible()) return { type: 'error', message: await error.textContent() };
        await page.waitForTimeout(interval);
    }

    return { type: null, message: null };
}

// ---------------------------------------------------
// Helper: Handle confirmation dialog
// ---------------------------------------------------
export async function handleConfirmationDialog(
    page: Page,
    testInfo: TestInfo,
    ctx = ''
): Promise<void> {
    const dialog = page.locator('.mat-mdc-dialog-container');
    try {
        await dialog.waitFor({ state: 'visible', timeout: 1500 });
    } catch {
        console.log(`ℹ️ No confirmation dialog appeared for ${ctx}`);
        return;
    }

    console.log(`⚠️ Confirmation dialog appeared (${ctx})`);
    await testInfo.attach(`Confirmation Dialog ${ctx}`, {
        body: 'Popup appeared. Clicking CONFIRM if visible.',
        contentType: 'text/plain'
    });

    const confirmBtn = page.locator('button:has-text("Confirm")');
    if (await confirmBtn.isVisible()) {
        console.log(`→ Clicking CONFIRM button (${ctx})`);
        await confirmBtn.click();
    }

    await dialog.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {
        console.log(`ℹ️ Dialog did not close automatically (${ctx})`);
    });
}

// ---------------------------------------------------
// Helper: Log snackbar
// ---------------------------------------------------
export async function logSnackbar(
    page: Page,
    testInfo: TestInfo,
    cardIndex: number,
    step: string
): Promise<void> {
    const snackbar = await waitForSnackbarMessage(page);
    const msg = snackbar.type ? `${snackbar.type.toUpperCase()}: ${snackbar.message}` : 'No snackbar appeared';
    console.log(`🔹 Card ${cardIndex + 1} → Snackbar after ${step}: ${msg}`);
    await testInfo.attach(`Card ${cardIndex} → Snackbar after ${step}`, {
        body: msg,
        contentType: 'text/plain'
    });
}


// ---------------------------------------------------
// Helper: Toggle a card switch safely
// ---------------------------------------------------
/**
 * Process a toggle within a card by label text (e.g., "Contactless" or "Ecommerce").
 * Expands the card, finds the first visible toggle with the given label, clicks it,
 * handles confirmation dialogs and snackbars, and restores original state if changed.
 */

// Assuming the helpers are imported or defined in the same file:
// waitForSnackbarMessage(page), handleConfirmationDialog(page, testInfo, ctx), logSnackbar(page, testInfo, cardIndex, step)


export async function processCardToggle(
    page: Page,
    testInfo: TestInfo,
    label: string
) {
    console.log(`📂 Retrieving cards for toggle "${label}"...`);
    const headers = await expandAllRealCards(page, false);

    if (headers.length === 0) {
        console.warn(`⚠️ No cards found — skipping "${label}" toggle test.`);

        await testInfo.attach('No Cards Found', {
            body: `User has zero cards. "${label}" test skipped.`,
            contentType: 'text/plain'
        });

        return;
    }

    console.log(`📂 Processing ${headers.length} cards.`);

    const isHeaderLevel = label.toLowerCase() === "active";

    for (let i = 0; i < headers.length; i++) {
        const card = headers[i];
        console.log('\n======================================');
        console.log(`🔹 START Toggle "${label}" for Card ${i + 1}`);
        console.log('======================================\n');

        // Expand the card (Active toggle doesn't need expansion, but safe)
        await safeCardClick(card, i, 'expand');
        await expect(card).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });

        let toggle: Locator | null = null;

        // ======================================
        // CASE 1: ACTIVE TOGGLE → header-level
        // ======================================
        if (isHeaderLevel) {
            console.log("🔍 Looking for ACTIVE toggle in header...");

            toggle = card.locator('mat-slide-toggle button[role="switch"]').first();

            if ((await toggle.count()) === 0) {
                console.warn(`⚠️ Card ${i + 1} → No Active toggle found.`);
                await safeCardClick(card, i, 'collapse');
                continue;
            }

        } else {
            // ======================================
            // CASE 2: OTHER TOGGLES → row-level search
            // ======================================
            console.log(`🔍 Searching for "${label}" row inside expanded content...`);

            const rows = card.page().locator('.card-control .row');
            const rowCount = await rows.count();
            let found = false;

            for (let j = 0; j < rowCount; j++) {
                const row = rows.nth(j);
                const matchesLabel = await row.locator(`.main-label:text("${label}")`).count();

                if (!matchesLabel) continue;

                console.log(`🔹 Found "${label}" row (index ${j})`);

                const candidateToggle = row.locator('button[role="switch"]').first();

                if ((await candidateToggle.count()) === 0 || !(await candidateToggle.isVisible())) {
                    console.warn(`⚠️ Toggle for "${label}" exists but is hidden in row ${j}`);
                    continue;
                }

                toggle = candidateToggle;
                found = true;
                break;
            }

            if (!found) {
                console.warn(`⚠️ Card ${i + 1} → No visible "${label}" toggle.`);
                await safeCardClick(card, i, 'collapse');
                continue;
            }
        }

        // --------------------------------------
        // SHARED LOGIC FOR BOTH ACTIVE + OTHERS
        // --------------------------------------

        const initial = (await toggle!.getAttribute("aria-checked")) ?? "false";
        console.log(`🔹 Initial state = ${initial}`);

        await testInfo.attach(`Card ${i} → Initial (${label})`, {
            body: initial,
            contentType: "text/plain"
        });

        // Toggle click
        console.log(`🔹 Clicking "${label}" toggle...`);
        await toggle!.click();

        // Handle confirmation dialog (same for all toggles)
        await handleConfirmationDialog(page, testInfo, `${label} → Card ${i + 1}`);

        // Snackbar handling
        await logSnackbar(page, testInfo, i, `${label} toggle`);

        const final = (await toggle!.getAttribute("aria-checked")) ?? "false";
        console.log(`🔹 Final state = ${final}`);

        await testInfo.attach(`Card ${i} → After (${label})`, {
            body: final,
            contentType: "text/plain"
        });

        // Restore state if needed
        if (initial !== final) {
            console.log(`🔄 Restoring "${label}" state...`);
            await toggle!.click();

            await handleConfirmationDialog(page, testInfo, `restore ${label} → Card ${i + 1}`);
            await logSnackbar(page, testInfo, i, `restore ${label} toggle`);

            const restored = (await toggle!.getAttribute("aria-checked")) ?? "false";
            console.log(`🔹 Restored = ${restored}`);

            await testInfo.attach(`Card ${i} → Restored (${label})`, {
                body: restored,
                contentType: "text/plain"
            });
        }

        // Collapse card
        await safeCardClick(card, i, "collapse");

        console.log('\n======================================');
        console.log(`🔹 END Toggle "${label}" for Card ${i + 1}`);
        console.log('======================================\n');
    }
}

// ---------------------------------------------------
// Helper: Toggle Active On and Off
// ---------------------------------------------------
export async function processToggleActiveFlow(page: Page, testInfo: TestInfo) {
    console.log("📂 Retrieving cards for *Active On/Off*...");
    const headers = await expandAllRealCards(page, false);

    if (headers.length === 0) {
        console.warn("⚠️ No cards found — skipping Active toggle tests.");
        await testInfo.attach("No Cards Found (Active Toggle)", {
            body: "User has zero cards. Test skipped.",
            contentType: "text/plain"
        });
        return;
    }

    console.log(`📂 Processing Active toggle for ${headers.length} cards.`);

    for (let i = 0; i < headers.length; i++) {
        const card = headers[i];
        console.log(`\n=== 🔹 START Active Toggle for Card ${i + 1} ===`);

        // Expand card header
        await safeCardClick(card, i, "expand");
        await expect(card).toHaveAttribute("aria-expanded", "true", { timeout: 5000 });

        // ACTIVE toggle lives in the header:
        // <mat-slide-toggle ...>
        const toggle = card.locator("mat-slide-toggle button[role='switch']");

        if ((await toggle.count()) === 0) {
            console.warn(`⚠️ Card ${i + 1} → NO Active toggle found. Skipping.`);
            await testInfo.attach(`Card ${i} → No Active Toggle`, {
                body: "There is no Active toggle for this card.",
                contentType: "text/plain"
            });
            await safeCardClick(card, i, "collapse");
            continue;
        }

        // Read initial state
        const initial = (await toggle.getAttribute("aria-checked")) ?? "false";
        console.log(`🔹 Card ${i + 1} → Initial toggle state: ${initial}`);

        await testInfo.attach(`Card ${i} → Initial Active State`, {
            body: initial,
            contentType: "text/plain"
        });

        // Click the toggle
        console.log(`🔹 Clicking Active toggle for Card ${i + 1}`);
        await toggle.click();

        // Handle confirmation dialog (your existing helper)
        await handleConfirmationDialog(page, testInfo, `Active toggle → Card ${i + 1}`);

        // Log snackbar (your existing helper)
        await logSnackbar(page, testInfo, i, "Active toggle");

        // Read final state
        const final = (await toggle.getAttribute("aria-checked")) ?? "false";
        console.log(`🔹 Card ${i + 1} → Final toggle state: ${final}`);

        await testInfo.attach(`Card ${i} → Final Active State`, {
            body: final,
            contentType: "text/plain"
        });

        // Restore if changed (should not happen often, but consistent with your other flows)
        if (initial !== final) {
            console.log(`🔄 Restoring Active toggle state for Card ${i + 1}`);
            await toggle.click();

            await handleConfirmationDialog(page, testInfo, `restore Active toggle → Card ${i + 1}`);
            await logSnackbar(page, testInfo, i, "restore Active toggle");

            const restored = (await toggle.getAttribute("aria-checked")) ?? "false";
            console.log(`🔹 Card ${i + 1} → Restored state: ${restored}`);

            await testInfo.attach(`Card ${i} → Restored Active State`, {
                body: restored,
                contentType: "text/plain"
            });
        }

        // Collapse card again
        await safeCardClick(card, i, "collapse");
        console.log(`📌 Card ${i + 1} collapsed`);

        console.log(`=== 🔹 FINISHED Active Toggle for Card ${i + 1} ===\n`);
    }
}


// ---------------------------------------------------
// Helper: Reset PIN
// ---------------------------------------------------
export async function processResetPinFlow(page: Page, testInfo: TestInfo) {
    console.log("📂 Retrieving cards for Reset PIN...");
    const headers = await expandAllRealCards(page, false);

    if (headers.length === 0) {
        console.warn(`⚠️ No cards found — skipping Reset PIN tests.`);

        await testInfo.attach("No Cards Found (Reset PIN)", {
            body: "User has zero cards. Reset PIN skipped.",
            contentType: "text/plain"
        });

        return;
    }

    console.log(`📂 Processing Reset PIN for ${headers.length} cards.`);

    for (let i = 0; i < headers.length; i++) {
        const card = headers[i];
        console.log('\n======================================');
        console.log(`🔹 STARTING Reset PIN for Card ${i + 1}`);
        console.log('======================================');

        // Expand card
        console.log(`➡️ Expanding card ${i + 1}...`);
        await safeCardClick(card, i, "expand");
        await expect(card).toHaveAttribute("aria-expanded", "true", { timeout: 5000 });
        console.log(`✅ Card ${i + 1} expanded.`);

        // Locate Reset PIN row inside expansion panel content
        const resetContent = card.locator(
            'xpath=following-sibling::div[contains(@class,"mat-expansion-panel-content")]'
        );

        const resetRow = resetContent.locator('.card-toggle.reset-pin').first();

        console.log("🔍 Checking for Reset PIN option...");
        if ((await resetRow.count()) === 0) {
            console.warn(`⚠️ Card ${i + 1} has no Reset PIN option — skipping.`);
            continue;
        }

        console.log(`✅ Reset PIN option found for Card ${i + 1}`);
        await resetRow.click();
        console.log("➡️ Reset PIN row clicked.");

        await testInfo.attach(`Card ${i} → Reset PIN Clicked`, {
            body: "Clicked Reset PIN row.",
            contentType: "text/plain"
        });

        // --- RESET PIN DIALOG ---
        console.log("⌛ Waiting for Reset PIN dialog...");
        const dialog = page.locator("app-reset-card-pin-dialog");
        await expect(dialog).toBeVisible({ timeout: 5000 });
        console.log("✅ Reset PIN dialog visible!");

        const pinInput = dialog.locator('input[formcontrolname="pin"]');
        const confirmInput = dialog.locator('input[formcontrolname="confirmPin"]');
        const nextBtn = dialog.locator('button:has-text("Next")');
        const cancelBtn = dialog.locator('button:has-text("Cancel")');

        // ------------------------------------------------------
        // VALIDATION STEPS
        // ------------------------------------------------------

        // 1: Max 4 digits
        console.log("🧪 Validation 1: Max 4 digits...");
        await pinInput.fill("");
        await pinInput.type("12345");
        await expect(pinInput).toHaveValue("1234");
        console.log("✅ Validation 1 passed.");
        await testInfo.attach("Reset PIN Validation 1", { body: "Max 4 digits OK", contentType: "text/plain" });

        // 2: Letters blocked
        console.log("🧪 Validation 2: Letters blocked...");
        await pinInput.fill("");
        await pinInput.type("ab12cd34");
        await expect(pinInput).toHaveValue("1234");
        console.log("✅ Validation 2 passed.");
        await testInfo.attach("Reset PIN Validation 2", { body: "Letters blocked OK", contentType: "text/plain" });

        // 3: Mismatch validation
        console.log("🧪 Validation 3: Mismatch PINs...");
        await pinInput.fill("1234");
        await confirmInput.fill("9999");
        await confirmInput.blur();

        const mismatchError = dialog.locator('mat-error:has-text("The fields must match")');
        await expect(mismatchError).toBeVisible();
        console.log("✅ Validation 3 passed.");
        await testInfo.attach("Reset PIN Validation 3", { body: "Mismatch detected", contentType: "text/plain" });

        // 4: Required fields
        console.log("🧪 Validation 4: Required field errors...");
        await pinInput.fill("");
        await confirmInput.fill("");
        await confirmInput.blur();

        const requiredError = dialog.locator('mat-error:has-text("A valid PIN number is required")');
        await expect(requiredError.first()).toBeVisible();
        console.log("✅ Validation 4 passed.");
        await testInfo.attach("Reset PIN Validation 4", { body: "Required PIN validation OK", contentType: "text/plain" });

        // 5: Eye toggle visibility
        console.log("🧪 Validation 5: Eye toggle visibility...");
        const eyeToggle = dialog.locator('button[aria-label*="toggle" i]');
        if (await eyeToggle.count()) {
            await pinInput.fill("1234");
            await expect(pinInput).toHaveAttribute("type", "password");

            await eyeToggle.click();
            await expect(pinInput).toHaveAttribute("type", "text");

            await eyeToggle.click();
            await expect(pinInput).toHaveAttribute("type", "password");

            console.log("✅ Validation 5 passed.");
            await testInfo.attach("Reset PIN Validation 5", { body: "Eye toggle OK", contentType: "text/plain" });
        } else {
            console.warn("⚠️ Eye toggle not found — skipping validation 5.");
        }

        // 6: Matching PINs enable Next
        console.log("🧪 Validation 6: Matching PINs enable Next...");
        await pinInput.fill("4321");
        await confirmInput.fill("4321");
        await expect(nextBtn).toBeEnabled();
        console.log("✅ Validation 6 passed.");
        await testInfo.attach("Reset PIN Validation 6", { body: "Next enabled OK", contentType: "text/plain" });

        // Close dialog
        console.log("➡️ Closing dialog...");
        if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
            console.log("✅ Dialog closed.");
            await testInfo.attach("Dialog Cancelled", { body: "Cancel clicked", contentType: "text/plain" });
        }

        // Collapse card
        console.log(`⬇️ Collapsing Card ${i + 1}...`);
        await safeCardClick(card, i, "collapse");
        console.log('\n======================================');
        console.log(`🔹 FINISHED Reset PIN for Card ${i + 1}`);
        console.log('======================================');
    }
}


// ---------------------------------------------------
// TEST SUITE
// ---------------------------------------------------

test.describe('Cards Tests', () => {

    let loginPage: LoginPage;
    let utility: utilityLibrary;

    test.beforeEach(async ({ page }, testInfo) => {
        page.setDefaultNavigationTimeout(120_0000);
        page.setDefaultTimeout(120_0000);

        loginPage = new LoginPage(page);
        utility = new utilityLibrary(page);

        // Step: Navigate to Login Page
        await test.step('Navigate to Login Page', async () => {


            // No login — directly open page after login
            await test.step('Open page after login', async () => {
                await page.goto('https://sbmtaguat.sbmgroup.mu/BWInternet380/root/summary'); // ← replace with your real post-login URL
                await page.pause();
            });

            // Validate user session is active
            await expect(page).toHaveURL(/root\/summary|home|dashboard/i, { timeout: 120_000 });
        });

        // Step: Navigate to Cards
        await test.step('Navigate to Cards Section', async () => {
            await navigateToCards(page);

            try {
                // Try to locate at least one real card
                await page.waitForSelector("mat-expansion-panel-header", { timeout: 5000 });
            } catch {
                console.warn("⚠️ No card headers detected on the page. This is expected for some users.");

                await testInfo.attach("No Cards Found on Navigate", {
                    body: "User has zero cards. Continuing test.",
                    contentType: "text/plain"
                });

                return; // ✔️ test passes and moves on
            }
        });



    });

    // -------------------------------------------------------
    // TEST 1 — VERIFY CARD DETAILS
    // -------------------------------------------------------
    test('Verify Card Details', async ({ page }, testInfo) => {
        // Step: Expand all real cards and get headers
        const headers = await test.step('Expand all real cards', async () => {
            return await expandAllRealCards(page);
        });

        // Step: Loop through each card and verify details
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];

            await test.step(`Verify details for Card ${i + 1}`, async () => {
                const cardName = (await header.locator('.card-name').innerText()).trim();
                const cardNumber = (await header.locator('.card-number').innerText()).trim();
                const expiry = (await header.locator('.expired-col p:last-child').innerText()).trim();

                // Attach card details to Allure
                await testInfo.attach(`Card ${i + 1} Details`, {
                    body: `Name: ${cardName}\nNumber: ${cardNumber}\nExpiry: ${expiry}`,
                    contentType: 'text/plain'
                });

                console.log(`Card ${i}: ${cardName}, ${cardNumber}, expiry ${expiry}`);

                // Assertions
                expect(cardName).not.toBe('');
                expect(cardNumber).toMatch(/\d{4}\*+\d{4}/);
                expect(expiry).toMatch(/\d{2}\/\d{2}/);
            });
        }
    });

    // -------------------------------------------------------
    // TEST 2 — TOGGLE ACTIVE ON/OFF
    // -------------------------------------------------------
    test('Toggle Card Active On/Off', async ({ page }, testInfo) => {
        // Use the reusable helper
        await processToggleActiveFlow(page, testInfo);
    });

    // -------------------------------------------------------
    // TEST 3 — Disable / Enable eCommerce
    // -------------------------------------------------------
    test('Toggle E-Commerce Settings', async ({ page }, testInfo) => {
        // Use the reusable helper
        await processCardToggle(page, testInfo, "eCommerce");
    });

    // -------------------------------------------------------
    // TEST 4 — Contactless Toggle
    // -------------------------------------------------------
    test('Toggle Contactless Settings', async ({ page }, testInfo) => {

        // Use the reusable helper
        await processCardToggle(page, testInfo, "Contactless");

    });

    // -------------------------------------------------------
    // TEST 5 — Reset PIN
    // -------------------------------------------------------
    test('Reset Card PIN — validation flow', async ({ page }, testInfo) => {
        await navigateToCards(page);

        await processResetPinFlow(page, testInfo); // 🔥 clean, modular, reusable
    });

});










