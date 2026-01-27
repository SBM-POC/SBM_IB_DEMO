import { expect, Page, Locator } from '@playwright/test';

export class PayTransferNavigation {
  private menuPayTransfer: Locator;
  private submenuOtherSbmTransfer: Locator;
  private buttonPayBeneficiaryOnce: Locator;
  private submenuPayOwnCreditCard: Locator;


  constructor(private readonly page: Page) {
    // Main Transactions menu tab
    this.menuPayTransfer = page.locator('#TRANSACTIONS_hor');

    // Submenu for "Other SBM Account Transfer"
    this.submenuOtherSbmTransfer = page.locator('[id="3rdpartyInsideBank_hor"]');

    // Button to initiate single beneficiary transfer
    this.buttonPayBeneficiaryOnce = page.locator('#ben_pay_once');

    // Submenu for "Pay Own Credit Card"
    this.submenuPayOwnCreditCard = page.locator('[id="creditCardPayment_hor"]');
  }

  /**
   * Opens the Transactions > Pay & Transfer menu
   */
  async goToTransferMenu(): Promise<void> {
    await this.menuPayTransfer.waitFor({ state: 'visible' });
    await this.menuPayTransfer.click();
  }

  /**
   * Selects the "Other SBM Account Transfer" option
   */
  async selectOtherSbmTransfer(): Promise<void> {
    await this.submenuOtherSbmTransfer.waitFor({ state: 'visible', timeout: 10000 });
    await this.submenuOtherSbmTransfer.click();

    // Optional verification: ensure Pay menu is active
    await expect(this.menuPayTransfer).toHaveClass(/active/);
  }

  /**
   * Clicks on "Pay Beneficiary Once" button to open transfer form
   */
  async clickPayBeneficiaryOnce(): Promise<void> {
    await this.buttonPayBeneficiaryOnce.waitFor({ state: 'visible' });
    await this.buttonPayBeneficiaryOnce.click({ timeout: 3000 });
  }

  /**
   * Selects the "Pay Own Credit Card" option
   */
  async selectPayOwnCreditCard(): Promise<void> {
    await this.submenuPayOwnCreditCard.waitFor({ state: 'visible', timeout: 10000 });
    await this.submenuPayOwnCreditCard.click();
    //await expect(this.menuPayTransfer).toHaveClass(/active/);
  }
}
