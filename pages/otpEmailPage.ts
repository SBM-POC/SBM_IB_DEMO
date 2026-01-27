import { Page, expect, BrowserContext } from '@playwright/test';

export class OtpEmailPage {
  private emailPage!: Page;

  constructor(private readonly context: BrowserContext) {}

  async getOtpFromEmail(): Promise<string> {
    this.emailPage = await this.context.newPage();

    await this.emailPage.goto('https://www.stackmail.com/');
    await this.emailPage.fill('input[name="_user"]', 'madhav.doorgah@rubric.mu');
    await this.emailPage.fill('input[name="_pass"]', `&Nx>KBiFG-\\6`);
    await this.emailPage.click('button[type="submit"]');

    const subject = this.emailPage.locator('span.subject a span', {
      hasText: 'SBM One Time Password'
    }).first();

    await expect(subject).toBeVisible({ timeout: 20000 });
    await subject.click();

    const frame = this.emailPage.frame({ name: 'messagecontframe' });
    const body = frame?.locator('div#message-htmlpart1.rcmBody');
    await expect(body!).toBeVisible({ timeout: 10000 });

    const content = await body!.textContent();
    const otp = content?.match(/\b\d{6}\b/)?.[0];

    if (!otp) throw new Error('[OtpEmailPage] OTP not found in email.');
    console.log('[OtpEmailPage] Retrieved OTP:', otp);

    await this.emailPage.close();
    return otp;
  }
}
