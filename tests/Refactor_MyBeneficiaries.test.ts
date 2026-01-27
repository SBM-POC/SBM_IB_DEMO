import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";
import { ReceiptHelper } from "../Helpers/RecieptHandler";
import { utilityLibrary } from "../Utils/utilityLibrary";
import { LoginPage } from "../pages/loginPage";
import { PayTransferMenu } from "../pages/PayTransferMenu";
import { MyAccount } from "../pages/MyAccountPage";
import { Refactored_MyBeneficiariesPage } from "../pages/Refactored_MyBeneficiariesPage";
import { readCsvData } from "../Utils/readCsvData";

const rows = readCsvData("TestData_Beneficiaries.csv");
const validTypes = ["Normal", "MACSS", "Instant"];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function clean(v: any) {
  return String(v ?? "").trim();
}

// ---------------------------------------------------------------------------
// ADD BENEFICIARY
// ---------------------------------------------------------------------------
test.describe("Add Beneficiaries (CSV)", () => {
  const addRows = rows.filter(r => clean(r.Action).toLowerCase() === "add");

  for (const [i, r] of addRows.entries()) {
    test(`ADD #${i + 1}: ${clean(r.PaymentName)}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu = new PayTransferMenu(page);
      const ben  = new Refactored_MyBeneficiariesPage(page);
      const acct = new MyAccount(page);

      await allure.step("Login", async () => {
        await login.goto();
        await login.login(clean(r.Username), clean(r.Password));
        await acct.assertMyAccountTabActive();
      });

      await allure.step("Open My Beneficiaries", async () => {
        await menu.openAndSelect("My Beneficiaries");
        await page.waitForURL(/beneficiaries/i);
      });

      await allure.step("Click Add Beneficiary", async () => {
        await ben.clickAdd();
      });

      const bank = clean(r.BankIdentifier);

      await allure.step(`Fill Form (${bank})`, async () => {
        if (bank === "Other SBM Account Transfer") {
          await ben.selectBankIdentifier("Other SBM Account Transfer");
          await ben.typePaymentName(clean(r.PaymentName));
          await ben.selectFromAccount(clean(r.FromAccount));
          await ben.typeAmount(clean(r.Amount));  
          await ben.typeRecipientAccount(clean(r.RecipientAccount));
          await ben.typeRemarks(clean(r.Remarks));
          if (r.Category) await ben.selectCategory(clean(r.Category));
        }

        else if (bank === "Other Local Bank Transfer") {
          await ben.selectBankIdentifier("Other Local Bank Transfer");
          const type = clean(r.TransferType);

          if (type === "MACSS") {
            const id = clean(r.MacssIdType) === "IBAN"
              ? clean(r.MacssId)
              : clean(r.RecipientAccount);
            if (clean(r.MacssIdType) === "IBAN") await ben.macssIbanFlow(id);
            else await ben.macssAccountFlow(id);
          } else {
            await ben.selectTransferType("Normal");
            await ben.typeRecipientAccount(clean(r.RecipientAccount));
          }

          await ben.typePaymentName(clean(r.PaymentName));
          await ben.selectFromAccount(clean(r.FromAccount));
          await ben.typeRemarks(clean(r.Remarks));
          if (r.Category) await ben.selectCategory(clean(r.Category));
        }

        else if (bank === "SWIFT Transfer") {
          await ben.swiftFlow({
            paymentName: clean(r.PaymentName),
            fromAccount: clean(r.FromAccount),
            currency: clean(r.Currency),
            remittanceAmount: clean(r.RemittanceAmount),
            beneficiaryCountry: clean(r.BeneficiaryCountry),
            beneficiaryIban: clean(r.BeneficiaryIban),
            address1: clean(r.BeneficiaryAddress1),
            address2: clean(r.BeneficiaryAddress2),
            address3: clean(r.BeneficiaryAddress3),
            beneficiaryBic: clean(r.BeneficiaryBankBIC),
            intermediaryBic: clean(r.IntermediaryBIC),
            chargeOption: clean(r.ChargeOption),
            remarks: clean(r.Remarks),
            category: clean(r.Category)
          });
        }

        else {
          throw new Error(`Unsupported BankIdentifier: ${bank}`);
        }
      });

      await allure.step("Save Beneficiary", async () => {
        await ben.save();
      });
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE BENEFICIARY
// ---------------------------------------------------------------------------
test.describe("Delete Beneficiaries (CSV)", () => {
  const delRows = rows.filter(r => clean(r.Action).toLowerCase() === "delete");

  for (const [i, r] of delRows.entries()) {
    test(`DELETE #${i + 1}: ${clean(r.PaymentName)}`, async ({ page }) => {
      const login = new LoginPage(page);
      const menu = new PayTransferMenu(page);
      const ben  = new Refactored_MyBeneficiariesPage(page);
      const acct = new MyAccount(page);

      await allure.step("Login", async () => {
        await login.goto();
        await login.login(clean(r.Username), clean(r.Password));
        await acct.assertMyAccountTabActive();
      });

      await allure.step("Open My Beneficiaries", async () => {
        await menu.openAndSelect("My Beneficiaries");
        await page.waitForURL(/beneficiaries/i);
      });

      await allure.step("Delete Beneficiary", async () => {
        await ben.deleteBeneficiary(clean(r.PaymentName));
      });
    });
  }
});

// ---------------------------------------------------------------------------
// EDIT BENEFICIARY
// ---------------------------------------------------------------------------
test.describe("Edit Beneficiaries (CSV)", () => {
  const editRows = rows.filter(r => clean(r.Action).toLowerCase() === "edit");

  for (const [i, r] of editRows.entries()) {
    test(`EDIT #${i + 1}: ${clean(r.PaymentName)}`, async ({ page }) => {
      
      const login = new LoginPage(page);
      const menu  = new PayTransferMenu(page);
      const ben   = new Refactored_MyBeneficiariesPage(page);
      const acct  = new MyAccount(page);
      const util  = new utilityLibrary(page);   // ✅ FIX ADDED

      // ---------------- LOGIN ----------------
      await allure.step("Login", async () => {
        await login.goto();
        await login.login(clean(r.Username), clean(r.Password));
        await acct.assertMyAccountTabActive();
      });

      // ---------------- OPEN BENEFICIARIES ----------------
      await allure.step("Open My Beneficiaries", async () => {
        await menu.openAndSelect("My Beneficiaries");
        await page.waitForURL(/beneficiaries/i);
      });

      // ---------------- START EDIT ----------------
      await allure.step("Open Beneficiary Details", async () => {
        await ben.openDetails(clean(r.PaymentName));
      });

      // ---------------- VERIFY RECIPIENT ACCOUNT READ-ONLY ----------------
      await allure.step("Verify Recipient Account is read-only", async () => {
        const recField = page.locator("//input[@id='beneficiary_recipientaccount']");
        await expect(recField).toBeDisabled();
      });

      // ---------------- APPLY BASIC EDIT FIELDS ----------------
      await allure.step("Edit Basic Fields", async () => {
        if (r.NewPaymentName) await ben.typePaymentName(clean(r.NewPaymentName));
        if (r.Amount)         await ben.typeAmount(clean(r.Amount));
        if (r.Remarks)        await ben.typeRemarks(clean(r.Remarks));
        if (r.Category)       await ben.selectCategory(clean(r.Category));
      });

      // ---------------- SWIFT TRANSFER EDIT LOGIC ----------------
      if (clean(r.BankIdentifier) === "SWIFT Transfer") {

        await allure.step("Edit SWIFT-specific Fields", async () => {

          if (r.Currency)
            await ben.selectCurrency(clean(r.Currency));

          if (r.RemittanceAmount) {
            await page
              .locator("//mat-label[normalize-space()='Remittance Amount']/ancestor::mat-form-field//input")
              .fill(clean(r.RemittanceAmount));
          }

          if (r.BeneficiaryCountry)
            await ben.selectBeneficiaryCountry(clean(r.BeneficiaryCountry));

          if (r.BeneficiaryIban)
            await page.locator("#beneficiary_recipientaccount").fill(clean(r.BeneficiaryIban));

          if (r.BeneficiaryAddress1)
            await page.locator("#beneficiary_beneficiaryAddress1").fill(clean(r.BeneficiaryAddress1));

          if (r.BeneficiaryAddress2)
            await page.locator("#beneficiary_beneficiaryAddress2").fill(clean(r.BeneficiaryAddress2));

          if (r.BeneficiaryAddress3)
            await page.locator("#beneficiary_beneficiaryAddress3").fill(clean(r.BeneficiaryAddress3));

          if (r.BeneficiaryBankBIC) {
            await page
              .locator("//mat-label[normalize-space()='Beneficiary Bank BIC']/ancestor::mat-form-field//input")
              .fill(clean(r.BeneficiaryBankBIC));
          }

          if (r.IntermediaryBIC) {
            await page
              .locator("//mat-label[normalize-space()='Intermediary Bank BIC']/ancestor::mat-form-field//input")
              .fill(clean(r.IntermediaryBIC));
          }

          // ---------------- CHARGE OPTION (FIXED) ----------------
          if (r.ChargeOption) {
            await util.selectDropdown(
              page,
              "//mat-label[normalize-space()='Charge Option']/ancestor::mat-form-field",
              clean(r.ChargeOption)
            );
          }
        });
      }

      // ---------------- SAVE ----------------
      await allure.step("Save Beneficiary", async () => {
        await ben.save();
      });
    });
  }
});

// ---------------------------------------------------------------------------
// QUICK PAY (Direct from Beneficiaries)
// ---------------------------------------------------------------------------
test.describe("Quick Pay (CSV)", () => {
  const payRows = rows.filter(r => clean(r.Action).toLowerCase() === "pay");

  for (const [i, r] of payRows.entries()) {
    test(`QUICK PAY #${i + 1}: ${clean(r.PaymentName)}`, async ({ page }) => {

      const login = new LoginPage(page);
      const menu  = new PayTransferMenu(page);
      const ben   = new Refactored_MyBeneficiariesPage(page);
      const acct  = new MyAccount(page);
      const util  = new utilityLibrary(page);

      // ---------------- LOGIN ----------------
      await allure.step("Login", async () => {
        await login.goto();
        await login.login(clean(r.Username), clean(r.Password));
        await acct.assertMyAccountTabActive();
      });

      // ---------------- OPEN BENEFICIARIES ----------------
      await allure.step("Open My Beneficiaries", async () => {
        await menu.openAndSelect("My Beneficiaries");
        await page.waitForURL(/beneficiaries/i);
      });

      // ---------------- ENSURE QUICK PAY ENABLED ----------------
      await allure.step("Enable Quick Pay", async () => {
        await ben.enableQuickPay(clean(r.PaymentName));
      });

      // ---------------- PERFORM QUICK PAY ----------------
      await allure.step("Perform Quick Pay", async () => {
        await ben.quickPay(clean(r.PaymentName), clean(r.Amount));
      });


      await allure.step("Attach Test Data Used", async () => {
  const testData = `
    Payment Name: ${clean(r.PaymentName)}
    From Account: ${clean(r.FromAccount)}
    Recipient Account: ${clean(r.RecipientAccount)}
    Amount: ${clean(r.Amount)}
    Payment Date: ${clean(r.PaymentDate)}
    Remarks: ${clean(r.Remarks)}
  `;
  await allure.attachment("Test Data Used", testData, "text/plain");
});


      // ---------------- CONFIRM PAGE VERIFICATION ----------------
      await allure.step("Verify Confirm Page", async () => {
        await ben.verifyQuickPayConfirmModal(
          clean(r.FromAccount),
          clean(r.RecipientAccount),
          clean(r.Amount),
          clean(r.PaymentDate),
          clean(r.Remarks)
        );
      });

      // ---------------- CLICK CONFIRM ----------------
      let refId = "";
      await allure.step("Confirm Quick Pay", async () => {
        await ben.confirmQuickPay();
      });

      // ---------------- SUCCESS PAGE VERIFICATION ----------------
      await allure.step("Verify Success Page", async () => {
        refId = await ben.verifyQuickPaySuccessModal(
          clean(r.FromAccount),
          clean(r.RecipientAccount),
          clean(r.Amount),
          "MUR",
          clean(r.PaymentDate),
          clean(r.Remarks)
        );

        await allure.attachment("Reference ID", refId, "text/plain");
      });

// ---------------- RECEIPT VERIFICATION ----------------
await allure.step("Verify Receipt Content", async () => {

  const maskedFrom = await ben.mask(clean(r.FromAccount));
  const maskedTo   = await ben.mask(clean(r.RecipientAccount));
  const formattedDate = await ben.formatDateDDMMYYYY(clean(r.PaymentDate));

  await ben.verifyQuickPayReceipt(
    maskedFrom,
    maskedTo,
    formattedDate,
    clean(r.Amount),
    "MUR",
    clean(r.Remarks),
    refId
  );
});


      // ---------------- LOGOUT ----------------
      await allure.step("Logout", async () => {
        await login.logout();
      });

    });
  }
});


// ========================= UI CHECK for  Beneficiary (Positive + Negative) =========================
test.describe("UI Check for Beneficiary )", () => {

  const scenarios = readCsvData("TestData_Beneficiaries_UI.csv"); 
  // CSV fields: Username, Password, BankIdentifier, TransferType, ShouldDisplay, ShouldAllowSave, NegativeCase

  const validTypes = ["Normal", "MACSS", "Instant"]; // FIXED missing variable

  for (const [index, row] of scenarios.entries()) {

    const scenarioLabel = row.Description?.trim();

    test(`Scenario ${index + 1}: ${scenarioLabel}`, async ({ page }) => {

      const username = row.Username.trim();
      const password = row.Password.trim();
      const bankIdentifier = row.BankIdentifier.trim();
      const transferType = row.TransferType.trim();
      const shouldDisplay = row.ShouldDisplay.trim();      
      const shouldAllowSave = row.ShouldAllowSave.trim();   
      const isNegative = (row.NegativeCase ?? "").trim().toLowerCase() === "yes";

      const login = new LoginPage(page);
      const acct = new MyAccount(page);
      const menu = new PayTransferMenu(page);
      const ben = new Refactored_MyBeneficiariesPage(page);

      // ------------------------- LOGIN -------------------------
      await allure.step("Login", async () => {
        await login.goto();
        await login.login(username, password);
        await acct.assertMyAccountTabActive();
      });

      // ------------------------- NAVIGATION -------------------------
      await allure.step("Navigate to My Beneficiaries", async () => {
        await menu.openAndSelect("My Beneficiaries");
        await page.waitForURL(/beneficiaries/i);
      });

      // --------------------- OPEN ADD BENEFICIARY ---------------------
      await allure.step("Open Add Beneficiary Form", async () => {
        await ben.clickAdd();
      });

      // =============================================================
      // 1️⃣ POSITIVE UI VALIDATION (Only when NOT a Negative case)
      // =============================================================
      if (!isNegative) {

        if (shouldDisplay.toLowerCase() === "yes") {

          await allure.step("Verify Mandatory Fields Are Visible", async () => {
            await expect(page.getByLabel("Payment Name")).toBeVisible();
            await expect(page.getByLabel(bankIdentifier, { exact: false })).toBeVisible();
            await expect(page.getByLabel("Recipient A/C No", { exact: false })).toBeVisible();
            await expect(page.getByLabel("Remarks", { exact: false })).toBeVisible();
          });

          await allure.step("Validate Bank Identifier Options", async () => {
            const options = await ben.getBankIdentifierOptions();
            await expect(options).toContain(bankIdentifier);
          });

          await allure.step("Validate Transfer Type Availability", async () => {
            const types = await ben.getTransferTypeOptions();
            await expect(types).toContain(transferType);
          });
        }

        if (shouldDisplay.toLowerCase() === "no") {
          await allure.step("Verify Form Should Not Display Required Fields", async () => {
            await expect(page.getByLabel("Payment Name")).not.toBeVisible();
          });
        }

        await allure.step("Validate Save Button State", async () => {
          const saveBtn = page.getByRole("button", { name: /save/i });

          if (shouldAllowSave.toLowerCase() === "yes") {
            await expect(saveBtn).toBeEnabled();
          } else {
            await expect(saveBtn).toBeDisabled();
          }
        });
      }

      // =============================================================
      // 2️⃣ NEGATIVE UI VALIDATION (Blank fields & Inline errors)
      // =============================================================
      if (isNegative) {

        // Select Bank Identifier & Transfer Type ONLY
        await allure.step("Select Bank Identifier", async () => {
          await ben.selectBankIdentifier(bankIdentifier);

          if (validTypes.includes(transferType)) {
            await ben.selectTransferType(transferType as "Normal" | "MACSS" | "Instant");
          }
        });

        await allure.step("Save should be disabled for blank form", async () => {
          const saveBtn = page.getByRole("button", { name: /save|update/i });
          await expect(saveBtn).toBeDisabled();
        });

        await allure.step("Verify Inline Error Messages", async () => {

          // Payment Name Error
          await expect(
            page.locator("mat-error", { hasText: /payment name|required/i })
          ).toBeVisible();

          // Recipient A/C error (only if field exists)
          if (await page.getByLabel("Recipient A/C No", { exact: false }).isVisible().catch(() => false)) {
            await expect(
              page.locator("mat-error", { hasText: /recipient/i })
            ).toBeVisible();
          }

          // Remarks error
          await expect(
            page.locator("mat-error", { hasText: /remarks/i })
          ).toBeVisible();

          // SWIFT-specific
          if (bankIdentifier === "SWIFT Transfer") {
            await expect(page.locator("mat-error", { hasText: /iban/i })).toBeVisible();
            await expect(page.locator("mat-error", { hasText: /bic/i })).toBeVisible();
          }

          // MACSS-specific
          if (bankIdentifier === "Other Local Bank Transfer" && transferType === "MACSS") {
            await expect(
              page.locator("mat-error", { hasText: /(account|iban)/i })
            ).toBeVisible();
          }
        });
      }

      // ------------------------- LOGOUT -------------------------
      await allure.step("Logout", async () => {
        await login.logout();
      });

    });
  }
});






