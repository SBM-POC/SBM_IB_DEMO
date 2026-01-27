import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/loginPage";
import { MyAccount } from "../pages/MyAccountPage";
import { ReloadPrepaidCardPage } from "../pages/Refactoring_ReloadPrepaidCard_Page";
import { loadRechargeCsv, RechargeRow } from "../Utils/excel";
import * as allure from "allure-js-commons";

const DATA: RechargeRow[] = loadRechargeCsv("./Data/TestData_RechargePrepaidCard.csv");
let confirmAmount: number;
let confirmRate: number;


test.describe("SIA-55|Recharge My Prepaid Card – Clean Refactored",  { tag: ['@E2E','@RechargePrepaidCard','@SIA-55'] },() => {

  for (const [i, row] of DATA.entries()) {

    test(`S${i + 1} - ${row.username} → ${row.transferTo}`, async ({ page }) => {

      const login = new LoginPage(page);
      const my = new MyAccount(page);
      const recharge = new ReloadPrepaidCardPage(page);

      let beforeFrom: number;
      let beforeTo: number;

      await allure.step("Login to Internet Banking", async () => {
        await login.goto();
        await login.login(row.username, row.password);
        await my.assertMyAccountTabActive();
      });

      await allure.step("Navigate to Recharge My Prepaid Card", async () => {
        await recharge.openFromTopNav();
      });

      await allure.step("Select the FROM account", async () => {
        await recharge.selectFromAccount(row.fromAccount);
      });

      await allure.step("Capture BEFORE balances for FROM account", async () => {
        beforeFrom = await recharge.readFromAccountBalance();
      });

      await allure.step("Select Pay/Transfer To card/account", async () => {
        const last4 = row.transferTo.slice(-4);
        await recharge.selectPayTransferTo(last4);
        await page.waitForTimeout(300);
        beforeTo = await recharge.readToAccountBalance();
      });

      await allure.step("Fill Recharge Amount and Remarks", async () => {
        await recharge.fillForm(row.amount, row.remarks);
      });

    await allure.step("Proceed to Confirm and capture FX details", async () => {
    await recharge.goToConfirm();            // Show confirm page

    // ⭐ Capture BEFORE submit
    confirmAmount = await recharge.getConfirmAmount();
    confirmRate = await recharge.getConfirmExchangeRate();
});


      await allure.step("Validate Success Message", async () => {
        await recharge.waitForSuccess();
      });

      await allure.step("Click 'Start Another Transfer'", async () => {
        await page.getByRole("button", { name: /Start Another Transfer/i }).click();
        await page.waitForTimeout(500);
        await expect(page.getByText(/^Details$/)).toBeVisible({ timeout: 10000 });
      });

      await allure.step("Re-select FROM and TO accounts for validation", async () => {
        await recharge.selectFromAccount(row.fromAccount);
        const last4again = row.transferTo.slice(-4);
        await recharge.selectPayTransferTo(last4again);
        await page.waitForTimeout(400);
      });

      await allure.step("Validate balances using FX logic after transaction", async () => {
        await recharge.validatePostTransactionBalances(
          beforeFrom,
          beforeTo,
          row.currency,
          row.amount
        );
      });

    });
  }
});
