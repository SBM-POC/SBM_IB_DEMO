import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration
 * Documentation: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  workers: 1,   // 👈 Run tests in a single worker

  testDir: './',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],

  outputDir: 'test-results',

  // Global test timeout per test (e.g. 5 minutes)
  timeout: 400000,

  //  Assertion timeout (used by expect)
  expect: {
    timeout: 10000
  },


  use: {
    baseURL: 'https://sbmtaguat.sbmgroup.mu/BWInternet380/root/summary',
    ignoreHTTPSErrors: true,
    headless: false,
    actionTimeout: 0,
    navigationTimeout: 60000,
    launchOptions: {
      slowMo: 300, // Slows down actions for visibility
      args: ['--start-maximized'] // Maximize the browser window
    },
    trace: 'on-first-retry', // Optional: trace viewer for failed tests
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },


  reporter: [
    ['list'], // CLI summary
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: false,
      suiteTitle: true,
      // Ensure screenshots are attached to Allure reports
      attachments: {
        screenshot: 'only-on-failure',
        video: 'on',

        //video: 'retain-on-failure',
        //trace: 'retain-on-failure'
      }
    }], // Allure report with screenshot config
    ['junit', { outputFile: 'results/junit-results.xml' }]
    // ['html'], // Optional: Playwright's built-in HTML report
  ],

  // 🌍 Browser projects
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: process.env.CI ? true : false,
        ignoreHTTPSErrors: true,
        // Screenshot configuration for this project
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure'
      }
    }

    // Uncomment below to run tests on additional browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] }
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] }
    // },
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' }
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' }
    // }
  ]
});

