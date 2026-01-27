import { expect, Page, Locator } from '@playwright/test';

export class DialogActions {
  private cancelButton: Locator;
  private closeButton: Locator;
  private dialog: Locator;

  constructor(private readonly page: Page) {
    this.cancelButton = page.locator('#BW_button_516086');
    this.closeButton = page.locator('#BW_button_733369');
    this.dialog = page.locator('mat-dialog-container:has(div.mat-body-strong)');
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.dialog.waitFor({ state: 'hidden' });
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.dialog.waitFor({ state: 'hidden' });
  }
}
