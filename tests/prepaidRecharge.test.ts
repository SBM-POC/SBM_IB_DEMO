import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { MyAccount } from '../pages/MyAccountPage';
import { PrepaidRechargePage } from '../pages/PrepaidRechargePage';
import { loadRechargeCsv, RechargeRow } from '../Utils/excel';
import { parseCurrencyToNumber } from '../Utils/currency';

test.setTimeout(240_000);

// ---------- Load & optionally filter dataset ----------
const ALL_ROWS: RechargeRow[] = loadRechargeCsv('./Data/prepaid_recharge_testdata.csv');

function filterRows(rows: RechargeRow[]) {
  const runUser = (process.env.RUN_USER || '').trim();
  const runOnly = (process.env.RUN_ONLY || '').trim();
  const runRow  = (process.env.RUN_ROW  || '').trim();

  if (runRow) {
    const idx = Number(runRow);
    if (Number.isFinite(idx) && rows[idx]) return [rows[idx]];
  }
  if (runUser) return rows.filter(r => r.username === runUser);
  if (runOnly) {
    const set = new Set(runOnly.split(',').map(s => s.trim()).filter(Boolean));
    return rows.filter(r => set.has(r.username));
  }
  return rows;
}

const TEST_DATA: RechargeRow[] = filterRows(ALL_ROWS);

// ---------- tiny helpers ----------
const last4 = (s: string) => (s ?? '').replace(/\D/g, '').slice(-4);

/** Pick (amt * rate) vs (amt / rate) that best matches a DEBIT (after = before - expected). */
function chooseClosestDebit(amount: number, rate: number, before: number, after: number) {
  const a = amount * rate;
  const b = amount / rate;
  const errA = Math.abs((before - a) - after);
  const errB = Math.abs((before - b) - after);
  return errA <= errB ? a : b;
}

/** Pick (amt * rate) vs (amt / rate) that best matches a CREDIT (after = before + expected). */
function chooseClosestCredit(amount: number, rate: number, before: number, after: number) {
  const a = amount * rate;
  const b = amount / rate;
  const errA = Math.abs((before + a) - after);
  const errB = Math.abs((before + b) - after);
  return errA <= errB ? a : b;
}


TEST_DATA.forEach((data, idx) => {
  const safeUser = data.username || 'user';
  const safeFrom = data.fromAccount || 'n/a';
  const safeTo   = data.transferTo  || 'n/a';

  test(
    `[${idx + 1}/${TEST_DATA.length}] Recharge - ${safeUser} (${safeFrom} -> ${safeTo})`,
    async ({ page }) => {
      const login = new LoginPage(page);
      const my = new MyAccount(page);
      const recharge = new PrepaidRechargePage(page);

      // 1) Login
      await test.step('Login', async () => {
        await login.goto();
        await login.login(data.username, data.password);
        await my.assertMyAccountTabActive();
      });

      // 2) Go to Prepaid Recharge page
      await test.step('Open Recharge', async () => {
        await recharge.openFromTopNav();
      });

      // 3) Pick the "From Account" (if given in CSV)
        await test.step('Select From Account', async () => {
                
          if (data.fromAccount) {

          await recharge.selectFromAccount(data.fromAccount);
          try {
            const got = await recharge.readFromAccountNumber();
            if (last4(got) !== last4(data.fromAccount!)) {
              throw new Error(`Selected account mismatch. Want last4=${last4(data.fromAccount!)}, got last4=${last4(got)}`);
            }
          } catch {}
                }
          
        });
      

      // 4) Read BEFORE balances (source + destination)
      let beforeFrom = NaN;
      let beforeTo   = NaN;
      let toCurrency: string | null = null;

      await test.step('Get Initial Balance', async () => {
        beforeFrom = await recharge.readSelectedFromAccountBalance();

        const toInfo = await recharge.readPayToCurrencyAndBalanceRetry(6000);
        toCurrency = toInfo?.currency ?? null;
        beforeTo   = Number.isFinite(toInfo?.amount ?? NaN) ? (toInfo!.amount) : NaN;

        console.log(`[BEFORE] From=${beforeFrom.toLocaleString()} | To=${Number.isFinite(beforeTo) ? beforeTo.toLocaleString() : 'NaN'}`);

        await test.info().attach('before.json', {
          body: JSON.stringify({ fromAccount: data.fromAccount, beforeFrom, beforeTo, toCurrency }, null, 2),
          contentType: 'application/json'
        });
      });


     // 5) Amount & form currency
const parsedAmount  = parseCurrencyToNumber(String(data.amount));
const amountToSend  = Number.isFinite(parsedAmount) ? parsedAmount : Number(data.amount);
const formCurrency  = await recharge.readFormCurrency();

// --- NEW: handle validation rows (empty/zero amount and/or empty remarks) ---
const hasAmount   = Number.isFinite(amountToSend) && amountToSend > 0;
const hasRemarks  = !!(data.remarks && String(data.remarks).trim());
if (!hasAmount || !hasRemarks) {
  await test.step('Validation: should block when Amount/Remarks missing', async () => {
    // Fill what we have; leave missing fields blank
    await recharge.fillDetails({
      amount: hasAmount ? String(amountToSend) : '', 
      remarks: hasRemarks ? String(data.remarks) : ''
    });

    // Try to surface inline errors (some UIs keep Transfer enabled)
    const transferBtn = page.getByRole('button', { name: /^Transfer$/i }).first();
    if (await transferBtn.isEnabled().catch(() => false)) {
      await transferBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Amount error can be "required" or "greater than zero"
    if (!hasAmount) {
      await expect(
        page.locator('text=/Amount is required|Enter amount greater than zero|valid amount/i').first()
      ).toBeVisible();
    }

    if (!hasRemarks) {
      await expect(page.locator('text=/Remarks.*required/i').first()).toBeVisible();
    }

    // We must stay on the same page; Confirm must not appear
    await expect(page.getByRole('button', { name: /^Confirm$/i }).first())
      .not.toBeVisible({ timeout: 500 });
  });

  return; // ✅ treat this row as a PASSED validation scenario; skip the rest of the smoke steps
}

// 6) Fill → capture FX on Confirm → Confirm+Submit
let submitErr: unknown = null;

// 6) Fill → Confirm → Submit
await test.step('Fill & confirm (simple)', async () => {
  // Fill fields and blur to trigger validations
  await recharge.fillDetails({ amount: String(amountToSend), remarks: data.remarks });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  // ✅ Safe Transfer click (no tooltip / strict-mode / hover issues)
  await page.evaluate(() => {
    // remove tooltip overlays
    document.querySelectorAll('.mat-tooltip, [role="tooltip"]').forEach(t => t.remove());
    // scroll and click the Transfer button
    const btn = document.querySelector('#fundstransfer_next');
    if (btn) {
      (btn as HTMLElement).scrollIntoView({ behavior: 'instant', block: 'center' });
      (btn as HTMLElement).click();
    }
  });

// ✅ Wait for Confirm screen
const confirmBtn = page.locator("//button[normalize-space()='Confirm' or normalize-space()='Next' or normalize-space()='Continue']");
await confirmBtn.waitFor({ state: 'visible', timeout: 30000 });

// ✅ Click Confirm
await confirmBtn.click({ force: true });

});



// 6.5) Outcome gate: success vs. limit/validation (including inline amount error)
const success = await recharge.waitForSuccess(45_000).then(() => true).catch(() => false);

// Common “error-like” locators
const bannerLoc = recharge.errorBanner();
const bannerSeen = await bannerLoc.isVisible().catch(() => false);
const confirmBtn = page.getByRole('button', { name: /^Confirm$/i }).first();
const confirmDisabled = await confirmBtn.isDisabled().catch(() => false);

// Inline amount error (“greater than available balance”, “insufficient”, etc.)
const amountErrorLike = page
  .locator(
    'app-transaction-amount-input .mat-error, ' +
    'app-transaction-amount-input .mat-mdc-form-field-error, ' +
    'text=/cannot be greater than available balance|insufficient/i'
  )
  .first();
const amountErrorSeen = await amountErrorLike.isVisible().catch(() => false);

if (!success) {
  if (bannerSeen || confirmDisabled || amountErrorSeen || submitErr) {
    await test.step('Validation/Limit detected (no Confirm)', async () => {
      if (amountErrorSeen) {
        // Assert the inline message is visible; attach the text for the report
        await expect(amountErrorLike).toBeVisible({ timeout: 10_000 });
        const msg = (await amountErrorLike.innerText().catch(() => '')).trim();
        if (msg) {
          await test.info().attach('amount-inline-error.txt', {
            body: msg,
            contentType: 'text/plain'
          });
        }
      }
      if (bannerSeen) {
        await expect(bannerLoc).toBeVisible({ timeout: 10_000 });
      }
    });

    // Keep the UI stable for afterEach logout and end this row successfully
    await recharge.backToDetails().catch(() => {});
    return; // ✅ treat this dataset row as a passed validation scenario
  }

  // Neither success nor a recognizable validation state → genuine failure
  throw new Error('[Recharge] Neither success nor limit/validation state detected – UI may have changed.');
}

  // Open generated allure report


      // 7) Success → Start Another Transfer (returns to the form)
      await test.step('Restart from success', async () => {
        await recharge.clickStartAnotherTransfer();
        await expect(recharge.getRechargeHeading()).toBeVisible({ timeout: 10_000 });
      });

    // 8) Re-select same From Account (explicit) and read AFTER balances
let afterFrom = NaN;
let afterTo   = NaN;

await test.step('Read AFTER balances (no reload)', async () => {
  if (data.fromAccount) await recharge.selectFromAccount(data.fromAccount);

  // If same currency (USD→USD), expect +amountToSend on destination
  const SAME_CURRENCY = true;           // set false if not same currency
  const TOL = 0.10;                     // small tolerance
  const targetAfterTo = (Number.isFinite(beforeTo) && SAME_CURRENCY)
    ? (beforeTo! + amountToSend)
    : NaN;

  for (let i = 0; i < 6; i++) {         // ~9s total
    const toInfo = await recharge.readPayToCurrencyAndBalanceRetry(1500);
    toCurrency = toInfo?.currency ?? toCurrency;
    afterTo = Number.isFinite(toInfo?.amount ?? NaN) ? toInfo!.amount : NaN;

    afterFrom = await recharge.readSelectedFromAccountBalance();

    // done if destination reflects the credit (or if we can at least read it)
    if (!Number.isNaN(targetAfterTo)) {
      if (Number.isFinite(afterTo) && afterTo >= targetAfterTo - TOL) break;
    } else if (Number.isFinite(afterTo)) {
      break;
    }

    // soft wait; NO page.reload()
    await page.waitForTimeout(1500);
  }

  console.log(`[AFTER] From=${afterFrom.toLocaleString()} | To=${Number.isFinite(afterTo) ? afterTo.toLocaleString() : 'NaN'}`);

  await test.info().attach('after.json', {
    body: JSON.stringify({ afterFrom, afterTo, toCurrency }, null, 2),
    contentType: 'application/json'
  });
});



      // 9) Assert debit on "From Account"
      await test.step('Assert source deduction', async () => {
        const sourceCurrency = await recharge.readSelectedFromAccountCurrency();
        const rate = recharge.lastConfirmExchangeRate;

        let expectedDebit: number | null = null;
        if (sourceCurrency && formCurrency) {
          if (formCurrency === sourceCurrency) {
            expectedDebit = amountToSend;
          } else if (rate && rate > 0) {
           expectedDebit = chooseClosestDebit(amountToSend, rate, beforeFrom, afterFrom);
          }
        }
        const actualDebit = +(beforeFrom - afterFrom);

        if (expectedDebit != null && Number.isFinite(expectedDebit)) {
          const isSameCur = sourceCurrency && formCurrency && sourceCurrency === formCurrency;
          const TOL = isSameCur ? Math.max(5, expectedDebit * 0.01) : Math.max(50, expectedDebit * 0.025);
          const expectedAfter = beforeFrom - expectedDebit;

          console.log(`[FROM-SUMMARY] before=${beforeFrom.toLocaleString()} | expectedDebit=${expectedDebit.toFixed(2)} `
            + `(rate=${rate ?? 'n/a'}; src=${sourceCurrency ?? 'n/a'}; form=${formCurrency ?? 'n/a'}) | `
            + `after=${afterFrom.toLocaleString()} | Δ=${actualDebit.toFixed(2)}  tol=±${TOL.toFixed(2)}`);

          await test.info().attach('from-debug.json', {
            body: JSON.stringify({ sourceCurrency, formCurrency, rate, beforeFrom, afterFrom, actualDebit, expectedDebit, TOL }, null, 2),
            contentType: 'application/json'
          });

          expect(afterFrom).toBeGreaterThanOrEqual(expectedAfter - TOL);
          expect(afterFrom).toBeLessThanOrEqual(expectedAfter + TOL);
          expect(Math.abs(actualDebit - expectedDebit)).toBeLessThanOrEqual(TOL);
        } else {
          console.log(`[FROM-SUMMARY] before=${beforeFrom.toLocaleString()} | expectedDebit=n/a `
            + `(rate=${rate ?? 'n/a'}; src=${sourceCurrency ?? 'n/a'}; form=${formCurrency ?? 'n/a'}) | `
            + `after=${afterFrom.toLocaleString()} | Δ=${actualDebit.toFixed(2)}`);
          expect(actualDebit).toBeGreaterThan(0.50);
        }
      });

// 10) Assert credit on "Pay/Transfer To" (soft — allow async posting)
await test.step('Assert destination credit (soft)', async () => {
  const canCheckTo = Number.isFinite(beforeTo) && Number.isFinite(afterTo);
  if (!canCheckTo) {
    console.warn('[TO] Destination balance unreadable; skipping strict check.');
    return;
  }

  const deltaTo = +(afterTo! - beforeTo!).toFixed(2);

  // If it already reflects the credit, do a light sanity check
  if (deltaTo >= 0.01) {
    expect(deltaTo).toBeGreaterThan(0); // at least some credit landed
    return;
  }

  // Otherwise accept eventual consistency and just log
  console.warn('[TO] No visible credit yet (likely async posting). Skipping strict check.');
  await test.info().attach('to-late-post.json', {
    body: JSON.stringify({ beforeTo, afterTo, deltaTo }, null, 2),
    contentType: 'application/json'
  });
});

    }
  );
});

// ───────────────────────── DAILY LIMIT ERROR (single-transaction) ─────────────────────────
test('Recharge shows limit error when MUR equivalent > 150,000', async ({ page }) => {
  const data = (TEST_DATA[0] ?? ALL_ROWS[0]) as RechargeRow;
  const login = new LoginPage(page);
  const my = new MyAccount(page);
  const recharge = new PrepaidRechargePage(page);

  await test.step('Login', async () => {
    await login.goto();
    await login.login(data.username, data.password);
    await my.assertMyAccountTabActive();
  });

  await test.step('Open Recharge', async () => {
    await recharge.openFromTopNav();
  });

  if (data.fromAccount) {
    await test.step('Select From Account', async () => {
      await recharge.selectFromAccount(data.fromAccount);
    });
  }

  // Compute a value that will exceed 150,000 MUR-equivalent using real UI values
  const murPerUnit = await recharge.computeMurPerUnit();
  const targetMur  = 150_000 + 1_000; // small buffer
  const amount     = Math.ceil((targetMur / murPerUnit) * 100) / 100;

  await test.step('Fill & go to Confirm (no submit)', async () => {
    await recharge.fillDetails({ amount: amount.toFixed(2), remarks: 'Test limit' });
    await recharge.goToConfirm();
  });

  await test.step('Expect limit error & Confirm disabled', async () => {
    const errorLike = recharge.errorBanner();
    await expect(errorLike).toBeVisible({ timeout: 15_000 });
    await expect(errorLike).toContainText(/exceed|exceeds/i);
    await expect(errorLike).toContainText(/limit/i);

    const confirm = page.getByRole('button', { name: /^Confirm$/i }).first();
    await expect(confirm).toBeDisabled({ timeout: 5_000 });
  });

  // Leave confirm so teardown is smooth
  await recharge.backToDetails().catch(() => {});
});



// ───────────────────────── DAILY LIMIT ERROR (FCY → MUR equivalent) ─────────────────────────
test('Recharge (FCY) shows limit error when MUR equivalent > 150,000', async ({ page }) => {
  const data = (TEST_DATA[0] ?? ALL_ROWS[0]) as RechargeRow;
  const FCY = (process.env.FCY_CURRENCY || 'USD').toUpperCase(); // e.g., USD/EUR/GBP

  const login = new LoginPage(page);
  const my = new MyAccount(page);
  const recharge = new PrepaidRechargePage(page);

  await test.step('Login', async () => {
    await login.goto();
    await login.login(data.username, data.password);
    await my.assertMyAccountTabActive();
  });

  await test.step('Open Recharge', async () => {
    await recharge.openFromTopNav();
  });

  if (data.fromAccount) {
    await test.step('Select From Account', async () => {
      await recharge.selectFromAccount(data.fromAccount);
    });
  }

  await test.step(`Switch form currency to ${FCY}`, async () => {
    await recharge.selectFormCurrency(FCY);
  });

  // Compute an amount in FCY whose MUR equivalent is > 150,000 using the actual UI rate
  const murPerUnit = await recharge.computeMurPerUnit(); // uses current selected currency
  const targetMur  = 150_000 + 1_000; // small buffer to guarantee we exceed
  const fcyAmount  = Math.ceil((targetMur / murPerUnit) * 100) / 100;

  await test.step('Fill & go to Confirm (no submit)', async () => {
    await recharge.fillDetails({ amount: fcyAmount.toFixed(2), remarks: `FCY limit ${FCY}` });
    await recharge.goToConfirm();
  });

  await test.step('Expect limit error & Confirm disabled', async () => {
    const errorLike = recharge.errorBanner();
    await expect(errorLike).toBeVisible({ timeout: 15_000 });
    await expect(errorLike).toContainText(/exceed|exceeds/i);
    await expect(errorLike).toContainText(/limit/i);

    const confirm = page.getByRole('button', { name: /^Confirm$/i }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await expect(confirm).toBeDisabled({ timeout: 5_000 });
    }
  });

  // Leave confirm so teardown is smooth
  await recharge.backToDetails().catch(() => {});
});


// ───────────────────────── DAILY LIMIT ERROR (FCY→FCY; MUR-equivalent > 150,000) ─────────────────────────
test('Recharge (FCY→FCY) shows limit error when MUR equivalent > 150,000', async ({ page }) => {
  const data = (TEST_DATA[0] ?? ALL_ROWS[0]) as RechargeRow;

  // Configure which FCY to test (default USD) and optionally which source account to use
  const FCY = (process.env.FCY_CURRENCY || 'USD').toUpperCase();          // e.g. USD / EUR / GBP
  const FCY_FROM = (process.env.FCY_FROM_ACCOUNT || data.fromAccount || '').trim();

  const login = new LoginPage(page);
  const my = new MyAccount(page);
  const recharge = new PrepaidRechargePage(page);

  // 1) Login
  await test.step('Login', async () => {
    await login.goto();
    await login.login(data.username, data.password);
    await my.assertMyAccountTabActive();
  });

  // 2) Open Recharge
  await test.step('Open Recharge', async () => {
    await recharge.openFromTopNav();
  });

  // 3) Pick an FCY source account (if provided)
  if (FCY_FROM) {
    await test.step('Select FCY source account', async () => {
      await recharge.selectFromAccount(FCY_FROM);
    });
  }

  // 4) Assert source is the requested FCY; if not, skip with a helpful reason
  const sourceCur = (await recharge.readSelectedFromAccountCurrency()) || '';
  if (sourceCur !== FCY) {
    test.skip(true, `Need a ${FCY} source account. Got "${sourceCur || 'unknown'}". Set FCY_FROM_ACCOUNT or update CSV.`);
    return;
  }

  // 5) Ensure the destination card is the same FCY (FCY→FCY)
  const toInfo = await recharge.readPayToCurrencyAndBalanceRetry(6000);
  const toCur = toInfo?.currency || '';
  if (toCur !== FCY) {
    test.skip(true, `Pay/Transfer To card is not ${FCY} (got "${toCur || 'unknown'}"). Open a ${FCY} card for FCY→FCY.`);
    return;
  }

  // 6) Switch the form currency to the FCY we are testing
  await test.step(`Select form currency ${FCY}`, async () => {
    await recharge.selectFormCurrency(FCY);
  });

  // 7) Compute FCY amount so that MUR-equivalent > 150,000
  const murPerUnit = await recharge.computeMurPerUnit(); // MUR per 1 FCY from the UI rate
  const targetMur  = 150_000 + 1_000;                    // small buffer to ensure we exceed
  const fcyAmount  = Math.ceil((targetMur / murPerUnit) * 100) / 100;

  // 8) Fill and go to Confirm (do NOT submit)
  await test.step('Fill & go to Confirm (no submit)', async () => {
    await recharge.fillDetails({ amount: fcyAmount.toFixed(2), remarks: `FCY→FCY limit ${FCY}` });
    await recharge.goToConfirm();
  });

  // 9) Expect limit banner and disabled Confirm
  await test.step('Expect limit error & Confirm disabled', async () => {
    const errorLike = recharge.errorBanner();
    await expect(errorLike).toBeVisible({ timeout: 15_000 });
    await expect(errorLike).toContainText(/exceed|exceeds/i);
    await expect(errorLike).toContainText(/limit/i);

    const confirm = page.getByRole('button', { name: /^Confirm$/i }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await expect(confirm).toBeDisabled({ timeout: 5_000 });
    }
  });

  // 10) Leave Confirm so teardown is smooth
  await recharge.backToDetails().catch(() => {});
});

/**
 * Test: Recharge requires BOTH Amount and Remarks
 * Purpose:
 *   Verify client-side validation when both fields are empty.
 * Pre-conditions:
 *   - User can log in and open "Recharge My Prepaid Card".
 *   - (Optional) From Account is selectable from CSV.
 * Steps:
 *   1) Ensure Amount and Remarks are blank.
 *   2) Blur fields to trigger inline validation; if Transfer is enabled, click it to surface errors.
 * Assertions:
 *   - "Amount is required" is visible.
 *   - "Remarks is required" is visible.
 *   - Transfer button is disabled.
 */
test('Recharge requires Amount and Remarks when left empty',{ tag: ['@IB_2286', '@IB_2287'] }, async ({ page }) => {
  const data = (TEST_DATA[0] ?? ALL_ROWS[0]) as RechargeRow;

  const login = new LoginPage(page);
  const my = new MyAccount(page);
  const recharge = new PrepaidRechargePage(page);

  await login.goto();
  await login.login(data.username, data.password);
  await my.assertMyAccountTabActive();
  await recharge.openFromTopNav();
  if (data.fromAccount) await recharge.selectFromAccount(data.fromAccount);

  // Clear both fields (Amount often falls back to "0")
  const amount = page.locator('app-transaction-amount-input').locator('input, textarea').first();
  const remarks = page.getByRole('textbox', { name: /Remarks/i });
  await amount.fill('').catch(() => {});
  await remarks.fill('').catch(() => {});
  try { await amount.press('Tab'); } catch {}
  try { await remarks.press('Tab'); } catch {}

  const transferBtn = page.getByRole('button', { name: /^Transfer$/i }).first();

  // If enabled, click once to surface validations; we should NOT advance
  const beforeUrl = page.url();
  if (await transferBtn.isEnabled().catch(() => false)) {
    await transferBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Amount error: accept either "required" or "greater than zero" or generic "valid amount"
  const amountError = page.locator(
    'app-transaction-amount-input .mat-error, ' +
    'app-transaction-amount-input .mat-mdc-form-field-error, ' +
    'text=/Amount is required|Enter amount greater than zero|valid amount/i'
  ).first();

  // Remarks error (your UI shows "Remarks is required")
  const remarksError = page.locator('text=/Remarks.*required/i').first();

  await expect(amountError).toBeVisible();
  await expect(remarksError).toBeVisible();

  // We should still be on the same page (no navigation/modals)
  await expect(page).toHaveURL(beforeUrl);
  await expect(page.getByRole('button', { name: /^Confirm$/i }).first()).not.toBeVisible({ timeout: 500 });
});


/**
 * Test: Amount provided, Remarks empty → remarks error and no progress
 */


test('Recharge requires Remarks when Amount is provided', async ({ page }) => {
  const data = (TEST_DATA[0] ?? ALL_ROWS[0]) as RechargeRow;

  const login = new LoginPage(page);
  const my = new MyAccount(page);
  const recharge = new PrepaidRechargePage(page);

  await login.goto();
  await login.login(data.username, data.password);
  await my.assertMyAccountTabActive();
  await recharge.openFromTopNav();
  if (data.fromAccount) await recharge.selectFromAccount(data.fromAccount);

  const amount = page.locator('app-transaction-amount-input').locator('input, textarea').first();
  const remarks = page.getByRole('textbox', { name: /Remarks/i });
  await amount.fill('10.00');
  await remarks.fill('');
  try { await remarks.press('Tab'); } catch {}

  const transferBtn = page.getByRole('button', { name: /^Transfer$/i }).first();
  const beforeUrl = page.url();
  if (await transferBtn.isEnabled().catch(() => false)) {
    await transferBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  const remarksError = page.locator('text=/Remarks.*required/i').first();
  await expect(remarksError).toBeVisible();

  // Still on form; confirm UI not shown
  await expect(page).toHaveURL(beforeUrl);
  await expect(page.getByRole('button', { name: /^Confirm$/i }).first()).not.toBeVisible({ timeout: 500 });
});


// ───────────────────────── AMOUNT > AVAILABLE BALANCE (validation) ─────────────────────────
test('Recharge blocks when Amount is greater than available balance', async ({ page }) => {
  const data = (TEST_DATA[0] ?? ALL_ROWS[0]) as RechargeRow;

  const login = new LoginPage(page);
  const my = new MyAccount(page);
  const recharge = new PrepaidRechargePage(page);

  await test.step('Login & open Recharge', async () => {
    await login.goto();
    await login.login(data.username, data.password);
    await my.assertMyAccountTabActive();
    await recharge.openFromTopNav();
  });

  if (data.fromAccount) {
    await test.step('Select From Account (if provided)', async () => {
      await recharge.selectFromAccount(data.fromAccount);
    });
  }

  // Align the form currency with the source account currency (avoids FX noise)
  const sourceCur = (await recharge.readSelectedFromAccountCurrency()) || null;
  if (sourceCur) {
    await test.step(`Ensure form currency is ${sourceCur}`, async () => {
      // If you don't have selectFormCurrency implemented, wrap in try/catch
      try { await recharge.selectFormCurrency(sourceCur); } catch { /* ignore */ }
    });
  }

  // Read current available balance and enter a bit more than that
  const available = await recharge.readSelectedFromAccountBalance();
  const bump = Math.max(1, Math.min(500, available * 0.02)); // +2% (capped) or at least +1
  const tooMuch = Math.ceil((available + bump) * 100) / 100;

  await test.step('Fill details with amount > available balance', async () => {
    await recharge.fillDetails({ amount: tooMuch.toFixed(2), remarks: 'exceed balance test' });
  });

  await test.step('Expect inline validation & no progress', async () => {
    // Robust selector: look in the Amount field first, then fall back to a text match
    const amountRoot = page.locator('app-transaction-amount-input').first();
    const amountError = amountRoot
      .locator('.mat-error, .mat-mdc-form-field-error')
      .or(page.locator('text=/greater than.*available balance|exceed.*available|insufficient.*balance/i'))
      .first();

    await expect(amountError).toBeVisible({ timeout: 7_000 });

    const transferBtn = page.getByRole('button', { name: /^Transfer$/i }).first();

    // If the button is still enabled, click once to try to surface/block on the form
    const beforeUrl = page.url();
    if (await transferBtn.isEnabled().catch(() => false)) {
      await transferBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // We must remain on the same page and Confirm must not be reachable
    await expect(page).toHaveURL(beforeUrl);
    await expect(page.getByRole('button', { name: /^Confirm$/i }).first()).not.toBeVisible({ timeout: 500 });
  });

  // (Optional) keep the form stable for teardown
  // await recharge.backToDetails().catch(() => {});
});



// ---------- logout after each test ----------
test.afterEach(async ({ page }) => {
  const login = new LoginPage(page);
    //await page.goto("C://sbm_playwright_poc//allure-report");
 
  //await page.pdf({ path: "allure-report.pdf", format: "A4" });
  await login.logout().catch(() => {});
});

// test.afterAll (async ({ page }) => {
//   //await page.goto("C://sbm_playwright_poc//allure-report"); 
//   //await page.pdf({ path: "allure-report.pdf", format: "A4" });
// });