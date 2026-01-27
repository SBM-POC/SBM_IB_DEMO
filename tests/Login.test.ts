import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { LoginPage } from '../pages/loginPage';

// -----------------------------------------------------------
// CSV TEST DATA LOADING
// -----------------------------------------------------------
interface UserScenario {
  FlowType: string;
  Scenario: string;
  Username: string;
  Password: string;
  ExpectedOutcome: string;     // Successful Login / Unsuccessful Login
  ExpectedResult: string;      // Navigate to Dashboard / Error Message displayed
  ErrorMessage: string;        // Expected error message (optional for Happy flow)
}

const csvPath = path.join(__dirname, '../Data/TestData_Users.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
const scenarios: UserScenario[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// -----------------------------------------------------------
// Scenario-based Login Test
// -----------------------------------------------------------
test.describe('Check Login', () => {

  scenarios.forEach((data) => {

    test(`${data.FlowType} – ${data.Scenario}`, async ({ page }, testInfo) => {

      const loginPage = new LoginPage(page);

      // -------------------------------------------
      // Tracking values
      // -------------------------------------------
      let actualOutcome = "Unsuccessful Login";
      let actualErrorMessage = "";
      let errorCaught = false;

      const launchStart = new Date();
      page.setDefaultNavigationTimeout(1200000);
      page.setDefaultTimeout(1200000);

      // Navigate to login page
      await loginPage.goto();
      const launchEnd = new Date();
      const launchDuration = launchEnd.getTime() - launchStart.getTime();
      const loginStart = new Date();

      // Attempt login (non-throwing)
      await loginPage.login(data.Username, data.Password);

      // Decide outcome explicitly
      if (await loginPage.isLoginSuccessful()) {
        actualOutcome = "Successful Login";
      } else {
        actualOutcome = "Unsuccessful Login";
        actualErrorMessage = await loginPage.getLoginErrorMessage();

        if (actualErrorMessage) {
          await testInfo.attach("UI Error Message", {
            body: actualErrorMessage,
            contentType: "text/plain"
          });

          const screenshot = await page.screenshot();
          await testInfo.attach("Screenshot", {
            body: screenshot,
            contentType: "image/png"
          });
        }
      }

      const loginEnd = new Date();
      const loginDuration = loginEnd.getTime() - loginStart.getTime();

      // -------------------------------------------
      // Build Allure HTML Summary
      // -------------------------------------------

      const outcomeColor =
        actualOutcome === "Successful Login" ? "green" : "red";

      const errorColor =
        data.ErrorMessage && actualErrorMessage.includes(data.ErrorMessage)
          ? "green"
          : "red";

      const timingHtml = `
        <div style="font-family: Arial; line-height: 1.6;">
          <h3>Login Validation Summary</h3>

          <p><b>Scenario:</b> ${data.Scenario}</p>
          <p><b>Username:</b> ${data.Username}</p>

          <p><b>Expected Outcome:</b> ${data.ExpectedOutcome}</p>
          <p><b>Actual Outcome:</b> 
            <span style="color:${outcomeColor}; font-weight:bold">${actualOutcome}</span>
          </p>

          <p><b>Expected Result:</b> ${data.ExpectedResult}</p>

      ${data.ErrorMessage
          ? `<p><b>Expected Error Message:</b> ${data.ErrorMessage}</p>
         <p><b>Actual Error Message:</b> 
            <span style="color:${errorColor}; font-weight:bold">
              ${actualErrorMessage || "(none)"}
            </span>
         </p>`
          : ""
        }

      <hr>

      <p><b>Launch Start:</b> ${launchStart.toISOString()}</p>
      <p><b>Launch End:</b> ${launchEnd.toISOString()}</p>
      <p><b>Launch Duration:</b> ${launchDuration} ms</p>
      <p><b>Login Start:</b> ${loginStart.toISOString()}</p>
      <p><b>Login End:</b> ${loginEnd.toISOString()}</p>
      <p><b>Login Duration:</b> ${loginDuration} ms</p>
    </div>
      `;

      await testInfo.attach('Login Summary', {
        body: timingHtml,
        contentType: 'text/html'
      });

      // -------------------------------------------
      // Assertions
      // -------------------------------------------

      // 1) ExpectedOutcome must match actualOutcome
      expect(
        actualOutcome === data.ExpectedOutcome,
        `Mismatch: ExpectedOutcome: ${data.ExpectedOutcome}, ActualOutcome: ${actualOutcome}`
      ).toBeTruthy();

      // 2) If expecting an error message → validate the text
      if (data.ErrorMessage && data.ErrorMessage.trim() !== "") {
        expect(
          actualErrorMessage.includes(data.ErrorMessage),
          `Expected error message:\n${data.ErrorMessage}\n\nActual:\n${actualErrorMessage}`
        ).toBeTruthy();
      }

    });

  });

});