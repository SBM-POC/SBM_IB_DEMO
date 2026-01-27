import { Page, TestInfo } from '@playwright/test';

let screenshotCounter = 0;

/**
 * Captures a screenshot with index and timestamp.
 * Saves it to /screenshots and attaches it to Allure.
 */
export async function captureScreenshot(
  label: string,
  page: Page,
  testInfo: TestInfo
): Promise<void> {
  screenshotCounter++;

  const ScreenshotTitle = label
    .replace(/[^a-zA-Z0-9-_ ]/g, '') // Remove special characters
    .replace(/\s+/g, '_')            // Replace spaces with underscores
    .slice(0, 80);                   // Prevent overly long filenames

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${screenshotCounter.toString().padStart(2, '0')}-${ScreenshotTitle}-${timestamp}.png`;
  const filePath = `screenshots/${fileName}`;

  // Save screenshot to disk
  await page.screenshot({ path: filePath });

  // Attach screenshot to Allure via testInfo
  await testInfo.attach(`Step ${screenshotCounter}: ${label}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  console.log(`[Screenshot] Saved and attached: ${filePath}`);
}

