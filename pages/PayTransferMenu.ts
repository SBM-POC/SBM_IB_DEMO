import { Page } from '@playwright/test';

export class PayTransferMenu {
  constructor(private readonly page: Page) {}

  // Open the desktop "Pay & Transfer" dropdown
  async open(): Promise<void> {
    await this.page
      .locator('#TRANSACTIONS_hor a span')
      .filter({ hasText: 'Pay & Transfer' })
      .click();
  }

  // Click a submenu item by exact text (e.g., "Bill Payments")
  async select(subItemText: string): Promise<void> {
    await this.page
      .locator('#TRANSACTIONS_hor')
      .getByText(subItemText, { exact: true })
      .click();
  }

  // Convenience wrapper
  async openAndSelect(subItemText: string): Promise<void> {
    await this.open();
    await this.select(subItemText);
  }
}