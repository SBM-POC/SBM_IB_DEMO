import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/loginPage";
import { PayTransferMenu } from "../pages/PayTransferMenu";
import { MyAccount } from "../pages/MyAccountPage";
import { My_BeneficiariesPage } from "../pages/My_BeneficiariesPage";
import { readCsvData } from "../Utils/readCsvData";

const quickPayRows = readCsvData("TestData_QuickPay.csv");

test.describe("Quick Pay (CSV)", () => {

  for (const [index, row] of quickPayRows.entries()) {
    test(`Quick Pay ${index + 1}: ${row.ScenarioName}`, async ({ page }) => {

      const login = new LoginPage(page);
      const menu = new PayTransferMenu(page);
      const ben = new My_BeneficiariesPage(page);
      const acct = new MyAccount(page);

      const paymentName = row.PaymentName.trim();
      const amount = String(row.Amount ?? "1");
      const username = row.Username.trim();
      const password = row.Password.trim();

      // --------------------------------------------------
      // 1️⃣ LOGIN
      // --------------------------------------------------
      await login.goto();
      await login.login(username, password);
      await acct.assertMyAccountTabActive();
      await expect(page.getByRole("heading", { name: /my accounts/i })).toBeVisible();

      // --------------------------------------------------
      // 2️⃣ OPEN MY BENEFICIARIES & TOGGLE QUICKPAY
      // --------------------------------------------------
      await menu.openAndSelect("My Beneficiaries");
      await page.waitForURL(/beneficiaries/i);

      await ben.enableQuickPay(paymentName);

      // --------------------------------------------------
      // 3️⃣ RETURN TO MY ACCOUNTS
      // --------------------------------------------------
      const myAccountsTab =
        page.getByRole("tab", { name: /^My Accounts$/i }).first()
        .or(page.getByRole("link", { name: /^My Accounts$/i }).first());

      if (await myAccountsTab.isVisible().catch(() => false)) {
        await myAccountsTab.click();
      } else {
        await menu.openAndSelect("My Accounts").catch(() => {});
      }

      await acct.assertMyAccountTabActive();

      // --------------------------------------------------
      // 4️⃣ EXECUTE QUICK PAY FROM MY ACCOUNTS
      // --------------------------------------------------
      await ben.quickPayFromMyAccounts(paymentName, amount);

      // --------------------------------------------------
      // 5️⃣ CONFIRM PAYMENT
      // --------------------------------------------------
      await ben.confirmQuickPay();

    });
  }
});
