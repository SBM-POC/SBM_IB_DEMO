// Utils/WaitForSpinner.ts
import { Page, Locator } from '@playwright/test';

/**
 * Soft-waits for common loading blockers to clear, then proceeds anyway after a cap.
 * No hard expect() calls here — avoids test timeouts on spinners that stay "visible" in DOM.
 */
export async function waitForSpinnerToDisappear(
  page: Page,
  opts: {
    /** Extra CSS selectors (comma-separated) to treat as blockers */
    extraSelectors?: string;
    /** Time to watch for a spinner to appear before giving up (ms) */
    appearTimeoutMs?: number;
    /** Max time to wait for blockers to clear once seen (ms) */
    disappearCapMs?: number;
    /** Polling interval (ms) */
    pollMs?: number;
    /** Log less */
    quiet?: boolean;
  } = {}
): Promise<void> {
  const appearTimeoutMs = opts.appearTimeoutMs ?? 5_000;
  const disappearCapMs  = opts.disappearCapMs  ?? 30_000;
  const pollMs          = opts.pollMs          ?? 200;

  // Default set of “blockers” you’ll see in this app
  const defaultSelectors = [
    '.cdk-overlay-backdrop.cdk-overlay-backdrop-showing',
    '.global-spinner:visible',
    'mat-progress-spinner[role="progressbar"]',
    'mat-progress-bar[mode="indeterminate"]',
    '.mdc-linear-progress',
    '.mat-mdc-dialog-container .mat-mdc-dialog-content:has(mat-progress-spinner)'
  ].join(', ');

  const combinedSelectors = opts.extraSelectors
    ? `${defaultSelectors}, ${opts.extraSelectors}`
    : defaultSelectors;

  const blockers = page.locator(combinedSelectors);

  // First: see if any blocker appears within the "appear" window
  const appearEnd = Date.now() + appearTimeoutMs;
  let appeared = false;
  while (Date.now() < appearEnd) {
    if (await anyVisible(blockers)) { appeared = true; break; }
    await page.waitForTimeout(pollMs);
  }

  if (!appeared) {
    if (!opts.quiet) console.log('[waitForSpinner] No spinner/blocker detected; continuing.');
    return;
  }

  if (!opts.quiet) console.log('[waitForSpinner] Blocker detected; soft-waiting for it to clear...');

  // Then: wait up to cap for the blockers to clear
  const end = Date.now() + disappearCapMs;
  while (Date.now() < end) {
    if (!(await anyVisible(blockers))) {
      if (!opts.quiet) console.log('[waitForSpinner] Blockers cleared.');
      return;
    }
    await page.waitForTimeout(pollMs);
  }

  console.warn('[waitForSpinner] Timed out waiting for blockers; proceeding anyway.');
}

async function anyVisible(loc: Locator): Promise<boolean> {
  const count = await loc.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    if (await loc.nth(i).isVisible().catch(() => false)) return true;
  }
  return false;
}

/**
 * Waits for the logout snackbar to appear (if it does) and then disappear.
 * Safe no-op if it never shows up.
 */
export async function waitForLogoutSnackbarToDisappear(page: Page, text = 'You have logged out successfully.'): Promise<void> {
  const label = page.locator(
    'simple-snack-bar .mat-mdc-snack-bar-label, .mdc-snackbar__label, mat-snack-bar-container, snack-bar-container'
  ).first();

  // Give it a short window to appear
  const appeared = await label.waitFor({ state: 'visible', timeout: 2_000 })
    .then(() => true)
    .catch(() => false);

  if (!appeared) return;

  // If we can read text, log it (best-effort)
  const txt = await label.innerText().catch(() => '');
  if (txt) console.log(`[logout-snackbar] "${txt.trim()}"`);

  // If it doesn’t auto-dismiss, don’t block forever
  await label.waitFor({ state: 'detached', timeout: 5_000 }).catch(() => {
    console.warn('[logout-snackbar] Did not detach in time; continuing.');
  });
}

/**
 * Waits for an error snackbar and verifies its message (substring match).
 * Does not fail hard if it never appears; returns true/false instead.
 */
export async function waitForErrorSnackbar(
  page: Page,
  expectedText: string,
  opts: { timeoutMs?: number; exact?: boolean } = {}
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 5_000;

  const container = page.locator(
    'mat-snack-bar-container, snack-bar-container, .mdc-snackbar'
  ).first();

  const appeared = await container.waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);

  if (!appeared) return false;

  // Try common label locations
  const label = page.locator(
    'simple-snack-bar .mat-mdc-snack-bar-label, .mdc-snackbar__label, mat-snack-bar-container, snack-bar-container'
  ).first();

  const actual = (await label.innerText().catch(() => '')).trim();
  const ok = opts.exact ? actual === expectedText : actual.includes(expectedText);

  if (ok) {
    console.log(`✅ Snackbar displayed with message: "${actual}"`);
  } else {
    console.warn(`⚠️ Snackbar text mismatch. Got "${actual}", expected ${opts.exact ? 'exact' : 'to include'} "${expectedText}".`);
  }

  // Let it go away, but don’t block too long
  await container.waitFor({ state: 'detached', timeout: 5_000 }).catch(() => {});
  return ok;
}
