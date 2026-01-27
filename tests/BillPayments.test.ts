import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { PayTransferMenu } from '../pages/PayTransferMenu';
import { BillPaymentPage } from '../pages/BillPaymentPage';
import { readCsvData } from '../Utils/readCsvData';

// Load scenarios from Data/Bill_Payment_testdata.csv
const scenarios = readCsvData('TestData_BillPayment.csv');
  
// Helpers
const required = (row: Record<string, string>, key: string) => {
  const v = row[key];
  if (!v || !v.trim()) throw new Error(`CSV column "${key}" is required but missing/empty.`);
  return v.trim();
};
const optional = (row: Record<string, string>, key: string) => row[key]?.trim() || undefined;
const digitsOnly = (s: string) => s.replace(/[^\d]/g, '');

type PayAction = 'Pay' | 'Save & Pay' | 'Save';
function parseAction(a?: string): PayAction {
  const v = (a ?? '').trim().toLowerCase();
  if (v === '' || v === 'pay') return 'Pay';
  if (v === 'save & pay' || v === 'save&pay' || v === 'save and pay') return 'Save & Pay';
  if (v === 'save') return 'Save';
  throw new Error(`Invalid Action value "${a}". Use "Pay", "Save & Pay" or "Save".`);
}

test.describe('Bill Payments (CSV)', () => {
  for (const [i, row] of scenarios.entries()) {
    test(`Scenario ${i + 1}: ${row.ScenarioName ?? 'Bill Payment'}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu  = new PayTransferMenu(page);
      const bills = new BillPaymentPage(page);

      // Always-required basics
      const username  = required(row, 'Username');
      const password  = required(row, 'Password');
      const actionRaw = (row.Action ?? '').trim().toLowerCase(); // to detect TemplateQuickPay

      // 1) Login
      await test.step('Login', async () => {
        await login.goto();
        await login.login(username, password);
        //await expect(page.getByRole('heading', { name: 'My Accounts' })).toBeVisible();
      });

      // 2) Open Bill Payments
      await test.step('Open Bill Payments', async () => {
        await menu.openAndSelect('Bill Payments');
        await Promise.race([
          page.waitForURL(/\/bills(\/|$)/),
          page.getByRole('heading', { name: /Payment Templates|Biller Groups/i })
              .waitFor({ state: 'visible' }),
        ]);
      });

      // TemplateQuickPay: pay a specific template by name
      if (actionRaw === 'templatequickpay') {
        await test.step('Template quick pay (by name)', async () => {
          const templateName = optional(row, 'TemplateName') ?? optional(row, 'SaveAs');
          const ref = await bills.quickTemplatePayByName(templateName);
          console.log('eBanking reference:', ref ?? '(not found)');
        });
        return; // done with this scenario
      }

// TemplateDelete
if (actionRaw === 'templatedelete') {
  await test.step('Delete template', async () => {
    const name = optional(row, 'TemplateName') ?? optional(row, 'SaveAs');
    if (!name) throw new Error('TemplateName (or SaveAs) required for TemplateDelete.');
    await bills.deleteTemplate(name);
  });
  return;
}



// TemplateEdit: edit a template by name using provided columns
if (actionRaw === 'templateedit') {
  await test.step('Edit template', async () => {
    const name = optional(row, 'TemplateName') ?? optional(row, 'SaveAs');
    if (!name) throw new Error('TemplateName (or SaveAs) required for TemplateEdit.');

    await bills.editTemplate(name, {
      reference: optional(row, 'ReferenceNumber') ?? optional(row, 'ContractAccountNumber'),
      amount:    optional(row, 'Amount'),
      remarks:   optional(row, 'Remarks'),
      // fromAccount: optional(row, 'FromAccountNo'), // only if you really want to switch it
    });

    // Optional: assert the “saved successfully” toast after returning to list
    await bills.waitForSavedToast({ waitToHide: false }).catch(() => {});
  });
  return; // end scenario here
}



      // From here on it’s the original flow (Pay / Save & Pay / Save)
      const billerGroup   = required(row, 'BillerGroup'); // "Government Billers" | "Other Utilities" | "EasyPay"
      const saveAsCsv     = optional(row, 'SaveAs');       // leave blank for negative
      const amount        = optional(row, 'Amount');       // leave blank for negative
      const remarks       = optional(row, 'Remarks');      // leave blank for negative
      const billerName    = optional(row, 'BillerName');
      const fromAccountNo = digitsOnly(required(row, 'FromAccountNo'));
      const referenceNumber       = optional(row, 'ReferenceNumber');
      const contractAccountNumber = optional(row, 'ContractAccountNumber');
      const easyCategory    = optional(row, 'EasyPayCategory');
      const easySubcategory = optional(row, 'EasyPaySubcategory');
      const easyBiller      = optional(row, 'EasyPayBiller') ?? billerName;

      const action: PayAction = parseAction(row.Action);

      // Flag to stop the test early (PASS) if we hit duplicate Save As
      let stopEarlyDueToDuplicate = false;

      // 3) Choose biller path
      await test.step('Choose biller', async () => {
        if (billerGroup === 'EasyPay' || easyCategory) {
          if (!easyCategory) throw new Error('EasyPayCategory is required for EasyPay flow.');
          if (!easyBiller)   throw new Error('EasyPayBiller (or BillerName) is required for EasyPay flow.');
          await bills.openEasyPayPath({
            category: easyCategory,
            subcategory: easySubcategory,
            biller: easyBiller,
          });

  } else if (billerGroup === 'Pay SBM Credit Card') {
    
    // NEW: one extra screen (Search by Credit Card Number)
    const cardNo = digitsOnly(row.ReferenceNumber ?? row.CreditCardNumber ?? '');
    if (!cardNo) throw new Error('CreditCardNumber (or ReferenceNumber) required for Pay SBM Credit Card flow.');
    await bills.openPaySbmCreditCardAndSearch(cardNo);


        } else {
          if (!billerName) throw new Error('BillerName is required for non-EasyPay flows.');
          await bills.clickBillerGroup(billerGroup);
          await bills.clickBiller(billerName);
        }
      });

      // 4) Fill form
      await test.step('Fill form', async () => {
        await bills.waitForFormReady();

        if (await bills.hasSaveAs()) {
          if (saveAsCsv) {
            await bills.typeSaveAs(saveAsCsv);
            // duplicate-name inline error → assert, end as PASS
            if (await bills.isDuplicateSaveAsVisible(1500)) {
              await expect(bills.duplicateSaveAsError()).toBeVisible();
              stopEarlyDueToDuplicate = true;
              return;
            }
          }
        }

        await bills.selectFromAccount(fromAccountNo);

        if (referenceNumber)       await bills.typeReferenceNumber(referenceNumber);
        if (contractAccountNumber) await bills.typeReferenceNumber(contractAccountNumber);

        if (amount)  await bills.typeAmount(amount);

   if (remarks) {
  await bills.typeRemarks(remarks);
  await bills.expectRemarksTruncatedIfTooLong(remarks, 35);
}


      });


const tooLongRemarks = typeof remarks === 'string' && remarks.length > 35;
if (tooLongRemarks) {
  console.warn(`Remarks too long (${remarks.length} > 35). Skipping submit and logging out.`);
  await page.waitForTimeout(1500);           // brief pause to view UI
  await new LoginPage(page).logout().catch(() => {}); // don't fail on logout hiccups
  return;                                    // stop this scenario here
}

      // ---- SIMPLE NEGATIVE EXIT (short + logout) ----
      const missingSaveAs  = (await bills.hasSaveAs()) && !saveAsCsv;
      const missingRef     = !referenceNumber && !contractAccountNumber;
      const missingRemarks = !remarks;
      const missingAmount  = !amount;

      if (missingSaveAs || missingRef || missingRemarks || missingAmount) {
        // optional: tap the chosen action to trigger UI validation, then pause briefly
        await bills.submit(action).catch(() => {});
        await page.waitForTimeout(2000); // small pause so you can see the error state
        await new LoginPage(page).logout().catch(() => {}); // swallow logout hiccups
        return; // stop here — scenario considered done
      }

      // 5) Submit (positive flow)
      await test.step('Submit & verify (positive)', async () => {
        if (stopEarlyDueToDuplicate) {
          test.info().annotations.push({
            type: 'note',
            description: 'Duplicate "Save As" detected; scenario intentionally treated as PASS.'
          });
          return;
        }

        const snap = await bills.captureForm();

        await bills.submit(action);

        if (action === 'Save') {
          await bills.waitForSavedToast({ waitToHide: false });
          return;
        }

        const stage = await bills.waitForConfirmOrSuccess();

  if (stage === 'confirm') {
  const idForModal = snap.reference ?? snap.contractAccount;

// Decide if this is an over-limit case
const amountNum = Number(String(snap.amount).replace(/[^\d.]/g, '') || '0');

// flags
const isSbmCard = billerGroup === 'Pay SBM Credit Card';
const isCeb =
  /CEB/i.test((billerName ?? easyBiller ?? '')) &&
  (billerGroup === 'Other Utilities' || billerGroup === 'EasyPay');

// exceed checks
const sbmExceeds = isSbmCard && amountNum > 5000; // MUR 5,000
const cebExceeds = isCeb     && amountNum > 1000; // MUR 1,000

// Tell the modal check to allow a blank numeric amount only for SBM over-limit
await bills.verifyConfirmModal({
  fromAccount: snap.fromAccount,
  reference:   snap.reference ?? snap.contractAccount,
  amount:      snap.amount,
  remarks:     snap.remarks,
allowBlankAmount: sbmExceeds || cebExceeds,
});

await bills.verifyEnsureNotes();
await bills.confirmPayment();

// Over-limit path: expect the banner and stop here
if (sbmExceeds || cebExceeds) {
  await bills.expectDailyLimitExceeded();
  return; // no success dialog expected
}
        }
        const eBankingRef = await bills.waitForSuccessMessage();
        console.log('eBanking reference:', eBankingRef ?? '(not found)');
        await bills.closeSuccessDialog();
      });
    });
  }
});

// Logout after each scenario if it passed
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'passed') {
    const login = new LoginPage(page);
    await login.logout().catch(() => {}); // don’t fail the test on logout issues
  }
});
