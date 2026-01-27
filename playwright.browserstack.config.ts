import { defineConfig } from '@playwright/test';

export default defineConfig({
  workers: 1,

  testDir: './',
  testMatch: ['*/.test.ts', '*/.spec.ts'], // ✅ FIXED

  outputDir: 'test-results',

  timeout: 400000,

  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: 'https://sbmtaguat.sbmgroup.mu/BWInternet380/root/summary',
    ignoreHTTPSErrors: true,
    actionTimeout: 0,
    navigationTimeout: 60000,

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  reporter: [
    ['list'],
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        suiteTitle: true,
        attachments: {
          screenshot: 'only-on-failure',
          video: 'on',
        },
      },
    ],
  ],

  projects: [
    {
      name: 'BrowserStack Chromium',
      use: {
        browserName: 'chromium',

        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(
            JSON.stringify({
              'bstack:options': {
                browser: 'chrome',
                browserVersion: 'latest',

                os: 'Windows',
                osVersion: '11',

                projectName: 'SBM IB Automation',
                buildName: 'GitHub Playwright Build #${process.env.GITHUB_RUN_NUMBER}',
                sessionName: 'Playwright BrowserStack Run',

                userName: process.env.BROWSERSTACK_USERNAME,
                accessKey: process.env.BROWSERSTACK_ACCESS_KEY,

                local: true,
                localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER,

                consoleLogs: 'errors',
                networkLogs: true,
              },
            })
          )}`,
        },
      },
    },
  ],
});