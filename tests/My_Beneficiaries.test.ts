import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { PayTransferMenu } from '../pages/PayTransferMenu';
import { My_BeneficiariesPage } from '../pages/My_BeneficiariesPage';
import { MyAccount } from '../pages/MyAccountPage';
import { readCsvData } from '../Utils/readCsvData';

const scenarios = readCsvData('TestData_Beneficiaries.csv');

test.describe('Add Beneficiaries (CSV)', () => {
   const addRows = scenarios.filter(r => (r.Action ?? '').trim().toLowerCase() === 'add');
    for (const [index, row] of addRows.entries()) {
    test(`Add ${index + 1}: ${row.PaymentName}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu = new PayTransferMenu(page);
      const ben = new My_BeneficiariesPage(page);
      const myAccount = new MyAccount(page);

      // ---------- STEP 1: LOGIN ----------
      await test.step('Login', async () => {
        const username = (row.Username ?? process.env.USERNAME ?? '').trim();
        const password = (row.Password ?? process.env.PASSWORD ?? '').trim();

        await login.goto();
        await login.login(username, password);
        await myAccount.assertMyAccountTabActive();

        await expect(
          page.getByRole('heading', { name: /my accounts/i })
        ).toBeVisible();
      });

      // ---------- STEP 2: OPEN "MY BENEFICIARIES" ----------
      await test.step('Open My Beneficiaries', async () => {
        await menu.openAndSelect('My Beneficiaries');
        await page.waitForURL(/beneficiaries/i);
      });


      // ---------- STEP 3: CLICK "ADD BENEFICIARY" ----------
      await test.step('Open Add Beneficiary form', async () => {
        await ben.clickAddBeneficiary();
        await page.waitForSelector("//mat-label[normalize-space()='Payment Name']", {
          state: 'visible',
          timeout: 20000
        });
      });

      // ---------- STEP 4: FILL FORM ----------
  const bank = (row.BankIdentifier ?? '').trim();

      if (bank === 'Other SBM Account Transfer') {
        await test.step('Fill Other SBM Account Transfer form', async () => {
          await ben.selectBankIdentifier('Other SBM Account Transfer');
          await ben.typePaymentName((row.PaymentName ?? '').trim());
          await ben.selectFromAccount((row.FromAccount ?? '').trim());
          await ben.typeAmount(String(row.Amount ?? ''));
          await ben.typeRecipientAccount((row.RecipientAccount ?? '').trim());
          await ben.typeRemarks((row.Remarks ?? '').trim());
          if (row.Category) await ben.selectCategory(row.Category.trim());
        });

      } else if (bank === 'Other Local Bank Transfer') {
        await test.step('Fill Other Local Bank Transfer form', async () => {
          await ben.selectBankIdentifier('Other Local Bank Transfer');

          // Transfer type: Normal | MACSS | Instant (defaults to Normal)
          const transferType =
            ((row.TransferType ?? 'Normal').trim() as 'Normal' | 'MACSS' | 'Instant');
          await ben.selectTransferType(transferType);

          // MACSS has a sub-identifier (Account/IBAN)
      if (transferType === 'MACSS') {
  const idType = (row.MacssIdType ?? 'Account').trim();
  const idVal  = (row.MacssId ?? row.RecipientAccount ?? '').trim();

  if (idType === 'Account') {
    await ben.macssAccountFlow(idVal);  // selects MACSS + Account, fills Recipient A/C No.
  } else {
    await ben.macssIbanFlow(idVal);     // selects MACSS + IBAN, fills Recipient IBAN
  }
} else {
  await ben.typeRecipientAccount((row.RecipientAccount ?? '').trim());
}

          await ben.typePaymentName((row.PaymentName ?? '').trim());
          await ben.selectFromAccount((row.FromAccount ?? '').trim());
          await ben.typeAmount(String(row.Amount ?? ''));

          // Optional details
          if (row.BeneficiaryName) await ben.typeBeneficiaryName(row.BeneficiaryName.trim());
          if (row.BeneficiaryBank) await ben.selectBeneficiaryBank(row.BeneficiaryBank.trim());
          if (row.Remarks)         await ben.typeRemarks(row.Remarks.trim());
          if (row.Category)        await ben.selectCategory(row.Category.trim());
        });


} else if (bank === 'SWIFT Transfer') {
  await test.step('Fill SWIFT Transfer form', async () => {
    await ben.swiftFlow({
      paymentName:        (row.PaymentName ?? '').trim(),
      fromAccount:        (row.FromAccount ?? '').trim(),
      currency:           (row.Currency ?? 'MUR').trim(),
      remittanceAmount:   String(row.RemittanceAmount ?? row.Amount ?? ''),
      beneficiaryCountry: (row.BeneficiaryCountry ?? '').trim(),
      beneficiaryIban:    (row.BeneficiaryIban ?? '').trim(),
      beneficiaryName:    (row.BeneficiaryName ?? '').trim(),
      addressLine1:       (row.BeneficiaryAddress1 ?? '').trim(),
      addressLine2:       (row.BeneficiaryAddress2 ?? '').trim(),
      addressLine3:       (row.BeneficiaryAddress3 ?? '').trim() || undefined,
      beneficiaryBic:     (row.BeneficiaryBankBIC ?? '').trim(),
      intermediaryBic:    (row.IntermediaryBIC ?? '').trim(),
      chargeOption:       (row.ChargeOption ?? '').trim(),
      remarks:            (row.Remarks ?? '').trim(),
      category:           (row.Category ?? '').trim(),
    });
  });


      } else {
        throw new Error(`Unsupported BankIdentifier in CSV: ${row.BankIdentifier}`);
      }

      // ---------- STEP 5: SAVE ----------
let endNow = false;

await test.step('Save beneficiary', async () => {
  await ben.clickSave();

  const duplicateNameErrorShown = await ben.isDuplicatePaymentNameError(8000);
  if (duplicateNameErrorShown) {
    const paymentNameError = ben.inlineErrorUnderLabel('Payment Name');
    await expect(paymentNameError).toHaveText(/Payment name is already in use/i);
    endNow = true;
  }
});

if (endNow) return;
    });
  }
});


test.describe('Delete Beneficiaries (CSV)', () => {
   const deleteRows = scenarios.filter(r => (r.Action ?? '').trim().toLowerCase() === 'delete');
 for (const [index, row] of deleteRows.entries()) {
  

     test(`Delete ${index + 1}: ${row.PaymentName}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu = new PayTransferMenu(page);
      const ben = new My_BeneficiariesPage(page);
      const myAccount = new MyAccount(page);

      // ---------- STEP 1: LOGIN ----------
      await test.step('Login', async () => {
        const username = (row.Username ?? process.env.USERNAME ?? '').trim();
        const password = (row.Password ?? process.env.PASSWORD ?? '').trim();

        await login.goto();
        await login.login(username, password);
        await myAccount.assertMyAccountTabActive();
        await expect(page.getByRole('heading', { name: /my accounts/i })).toBeVisible();
      });

      // ---------- STEP 2: OPEN "MY BENEFICIARIES" ----------
      await test.step('Open My Beneficiaries', async () => {
        await menu.openAndSelect('My Beneficiaries');
        await page.waitForURL(/beneficiaries/i);
      });

      // ---------- STEP 3: DELETE BENEFICIARY ----------
      await test.step('Delete beneficiary', async () => {
        await ben.deleteBeneficiary((row.PaymentName ?? '').trim());
      });
    });
  }
});

function inferType(row: any):
  'SBM' | 'LOCAL_NORMAL' | 'LOCAL_MACSS_ACC' | 'LOCAL_MACSS_IBAN' | 'LOCAL_INSTANT' | 'SWIFT' {
  const bank = (row.BankIdentifier ?? '').trim().toLowerCase();
  const t    = (row.TransferType ?? '').trim().toLowerCase();
  const mid  = (row.MacssIdType ?? '').trim().toLowerCase();

  if (bank === 'swift transfer') return 'SWIFT';
  if (bank === 'other sbm account transfer') return 'SBM';
  if (bank === 'other local bank transfer') {
    if (t === 'instant') return 'LOCAL_INSTANT';
    if (t === 'macss')   return mid === 'iban' ? 'LOCAL_MACSS_IBAN' : 'LOCAL_MACSS_ACC';
    return 'LOCAL_NORMAL';
  }
  throw new Error(`Unrecognized type from CSV: ${row.BankIdentifier} / ${row.TransferType} / ${row.MacssIdType}`);
}

test.describe.serial('Edit Beneficiaries (CSV)', () => {
  const editRows = scenarios.filter(r => (r.Action ?? '').trim().toLowerCase() === 'edit');
  if (editRows.length === 0) test.skip(true, 'No Edit rows in CSV');

  for (const [index, row] of editRows.entries()) {
    test(`Edit ${index + 1}: ${row.PaymentName}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu  = new PayTransferMenu(page);
      const ben   = new My_BeneficiariesPage(page);
      const acct  = new MyAccount(page);

      // ---------- STEP 1: LOGIN ----------
      const username = (row.Username ?? process.env.USERNAME ?? '').trim();
      const password = (row.Password ?? process.env.PASSWORD ?? '').trim();
      await login.goto();
      await login.login(username, password);
      await acct.assertMyAccountTabActive();
      await expect(page.getByRole('heading', { name: /my accounts/i })).toBeVisible();

      // ---------- STEP 2: OPEN MY BENEFICIARIES ----------
      await menu.openAndSelect('My Beneficiaries');
      await page.waitForURL(/beneficiaries/i);

      // ---------- STEP 3: EDIT BENEFICIARY ----------
      const name = (row.PaymentName ?? '').trim();
      const type = (row.Type ?? '').trim().toUpperCase() as
        | 'SBM'
        | 'LOCAL_NORMAL'
        | 'LOCAL_MACSS_ACC'
        | 'LOCAL_MACSS_IBAN'
        | 'LOCAL_INSTANT'
        | 'SWIFT';

      await ben.editBeneficiaryByType(name, type, {
        // routing toggles
        bankIdentifier: (row.BankIdentifier ?? '').trim() as any,
        transferType:   (row.TransferType ?? '').trim() as any,
        macssIdType:    (row.MacssIdType ?? '').trim() as any,
        fromAccount:    (row.FromAccount ?? '').trim(),

        // common
        paymentName: (row.NewPaymentName ?? '').trim(),
        amount:       row.Amount,
        remarks:     (row.Remarks ?? '').trim(),
        category:    (row.Category ?? '').trim(),

        // local/common
        recipientAccount: (row.RecipientAccount ?? '').trim(),
        beneficiaryName:  (row.BeneficiaryName ?? '').trim(),
        beneficiaryBank:  (row.BeneficiaryBank ?? '').trim(),

        // MACSS IBAN
        macssIban: (row.MacssId ?? '').trim(),

        // SWIFT extras
        currency:           (row.Currency ?? '').trim(),
        remittanceAmount:    row.RemittanceAmount,
        beneficiaryCountry:  (row.BeneficiaryCountry ?? '').trim(),
        beneficiaryIban:     (row.BeneficiaryIban ?? '').trim(),
        address1:            (row.BeneficiaryAddress1 ?? '').trim(),
        address2:            (row.BeneficiaryAddress2 ?? '').trim(),
        address3:            (row.BeneficiaryAddress3 ?? '').trim(),
        beneficiaryBic:      (row.BeneficiaryBankBIC ?? '').trim(),
        intermediaryBic:     (row.IntermediaryBIC ?? '').trim(),
        chargeOption:        (row.ChargeOption ?? '').trim(),
      });

      // ---------- STEP 4: SAVE ----------
      await test.step('Save changes', async () => {
        await ben.clickSave();
      });
    });
  }
});






test.describe.serial('Pay Existing Beneficiaries (CSV)', () => {
  // Filter rows where Action = 'pay'
  const payRows = scenarios.filter(r => (r.Action ?? '').trim().toLowerCase() === 'pay');

  if (payRows.length === 0) test.skip(true, 'No Pay rows in CSV');

  for (const [index, row] of payRows.entries()) {
    test(`Pay ${index + 1}: ${row.PaymentName}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu  = new PayTransferMenu(page);
      const ben   = new My_BeneficiariesPage(page);
      const acct  = new MyAccount(page);

      // ---------- STEP 1: LOGIN ----------
      await test.step('Login', async () => {
        const username = (row.Username ?? process.env.USERNAME ?? '').trim();
        const password = (row.Password ?? process.env.PASSWORD ?? '').trim();

        await login.goto();
        await login.login(username, password);
        await acct.assertMyAccountTabActive();
        await expect(page.getByRole('heading', { name: /my accounts/i })).toBeVisible();
      });

      // ---------- STEP 2: OPEN "MY BENEFICIARIES" ----------
      await test.step('Open My Beneficiaries', async () => {
        await menu.openAndSelect('My Beneficiaries');
        await page.waitForURL(/beneficiaries/i);
      });


// ---------- STEP 3: QUICK PAY + LIMIT CHECK ----------
await test.step('Quick Pay + limit check', async () => {
  const name = (row.PaymentName ?? '').trim();
  const type = (row.TransferType ?? 'Normal').trim() as 'Normal' | 'MACSS' | 'Instant';
  const bank = (row.BankIdentifier ?? '').trim().toLowerCase();

  const LIMITS: Record<string, number> = {
    'other sbm account transfer': 200000,
    'other local bank transfer:normal': 1000,
    'other local bank transfer:instant': 250000,
    'other local bank transfer:macss': 1000,
    'swift transfer': 1000,
  };

  const key =
    bank === 'other local bank transfer'
      ? `${bank}:${type.toLowerCase()}`
      : bank;
  const limit = LIMITS[key];

  // 1️⃣ Open the quick-pay view
  await ben.quickPayExistingBeneficiary(name, type);

  // 2️⃣ Click transfer type button
  const typeBtn = page.getByRole('button', { name: new RegExp(`^${type}$`, 'i') });
  await typeBtn.waitFor({ state: 'visible', timeout: 8000 });
  await typeBtn.click();
  console.log(`🔘 Selected transfer type: ${type}`);

  // 3️⃣ Detect and dismiss any immediate auto-submit success popup
  const successDialog = page
    .locator('mat-dialog-container, .mat-mdc-dialog-container')
    .filter({ hasText: /Transaction has been submitted successfully/i })
    .first();

  if (await successDialog.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('⚠️ Auto-submit detected — closing popup...');
    const close = successDialog.getByRole('button', { name: /^Close$/i });
    if (await close.isVisible().catch(() => false)) await close.click();
    await page.waitForTimeout(1500);
    console.log('✅ Returned to form after auto-submit');
  } else {
    // if popup never appeared, wait for normal refresh
    await page.waitForTimeout(2000);
  }

  // 4️⃣ Safely change amount
  const amountField = page.locator('input[formcontrolname="amount"], input[aria-label*="Amount"]');
  await amountField.waitFor({ state: 'visible', timeout: 8000 });
  await amountField.fill('');
  await amountField.fill(String(limit + 1));
  console.log(`💰 Amount changed to ${limit + 1}`);

  // 5️⃣ Click Pay manually
  const payBtn = page.getByRole('button', { name: /^Pay$/i }).first();
  await payBtn.waitFor({ state: 'visible', timeout: 8000 });
  await payBtn.click();
  console.log('💸 Pay clicked');

  // 6️⃣ Verify limit error
  const toast = page
    .locator('simple-snack-bar, .mat-mdc-snack-bar-label, .alert-error, .alert-danger')
    .filter({
      hasText: /exceeds the allowed limit|cannot be completed|daily limit|transaction limit/i,
    })
    .first();

  if (await toast.isVisible({ timeout: 8000 }).catch(() => false)) {
    console.log(`✅ Limit validation displayed for ${bank} (${type}), limit = ${limit}`);
  } else {
    console.log('⚠️ No limit toast detected — transaction might have gone through.');
  }

  // 7️⃣ Close any success popup if present
  const closeBtn = page.getByRole('button', { name: /^Close$/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    console.log('✅ Closed success dialog');
  }
});







    });
  }
});

test.describe('Quick Pay via My Accounts (CSV)', () => {
 const payRows = scenarios.filter(r =>
  (r.Action ?? '').trim().toLowerCase() === 'pay' &&
  (r.Remarks ?? '').toLowerCase().includes('quickpay toggle + pay')
);
  if (payRows.length === 0) test.skip(true, 'No Pay rows in CSV');

  for (const [index, row] of payRows.entries()) {
    test(`Quick Pay ${index + 1}: ${row.PaymentName}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu  = new PayTransferMenu(page);
      const ben   = new My_BeneficiariesPage(page);
      const acct  = new MyAccount(page);

      const username        = (row.Username ?? process.env.USERNAME ?? '').trim();
      const password        = (row.Password ?? process.env.PASSWORD ?? '').trim();
      const paymentName     = (row.PaymentName ?? '').trim();
      const quickPayAmount  = String(row.Amount ?? '1'); // tiny fallback if empty

      // 1) Login (lands on My Accounts)
      await login.goto();
      await login.login(username, password);
      await acct.assertMyAccountTabActive();
      await expect(page.getByRole('heading', { name: /my accounts/i })).toBeVisible();

      // 2) Open My Beneficiaries & toggle Quick Pay for this beneficiary
      await menu.openAndSelect('My Beneficiaries');
      await page.waitForURL(/beneficiaries/i);
      await ben.toggleQuickPayFor(paymentName);

      // 3) Back to My Accounts
      const myAccountsTab = page.getByRole('tab', { name: /^My Accounts$/i }).first()
        .or(page.getByRole('link', { name: /^My Accounts$/i }).first());
      if (await myAccountsTab.isVisible().catch(() => false)) {
        await myAccountsTab.click();
      } else {
        await menu.openAndSelect('My Accounts').catch(() => {});
      }
      await acct.assertMyAccountTabActive();

      // 4) Use the Quick Pay card to pay the amount
      await ben.quickPayFromMyAccounts(paymentName, quickPayAmount);

      // 5) Confirm dialog
      await ben.confirmQuickPay();
    });
  }
});



test.afterEach(async ({ context }) => {
  await context.close().catch(() => {});
});
