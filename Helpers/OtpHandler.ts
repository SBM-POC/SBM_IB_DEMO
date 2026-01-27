import { expect, Page, Locator } from '@playwright/test';

export class OtpHandler {
  private otpField: Locator;
  private confirmButton: Locator;
  private successDialog: Locator;
  private successMessage: Locator;

  constructor(private readonly page: Page) {
    this.otpField = page.locator('#BW_text_929381');
    this.confirmButton = page.locator('#BW_button_021029');
    this.successDialog = page.locator('#mat-mdc-dialog-0');
    this.successMessage = page.locator('p.mat-subtitle-2.align-center', {
      hasText: 'Transfer successful'
    });
  }

  async submitOtp(otpValue: string): Promise<void> {
    // if (otpValue.trim()) {
    //   await this.otpField.fill(otpValue.trim());
    // }

    await this.confirmButton.click();

    // if (otpValue.trim()) {
    //   // Wait for either success or error based on validity
    //   const isSuccessful = await this.successDialog.isVisible({ timeout: 5000 });
    //   expect(isSuccessful).toBe(true);
    //   await expect(this.successMessage).toBeVisible();
    // } else {
    //   const otpError = this.page.locator('mat-error', { hasText: 'Invalid OTP' });
    //   await expect(otpError).toBeVisible({ timeout: 5000 });
    // }
  }
}
