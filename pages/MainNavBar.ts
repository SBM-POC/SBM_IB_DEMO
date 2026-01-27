import { Page, Locator } from '@playwright/test';

/**
 * NavBar (desktop main navbar)
 * Clicks a top-level item in the horizontal navbar by its visible <span> text.
 * Scoping to the horizontal nav avoids mobile/left-drawer duplicates.
 */
export class NavBar {
  private readonly page: Page;
  private readonly navRoot: Locator;

  constructor(page: Page) {
    this.page = page;
    // Scope to the top horizontal navbar
    this.navRoot = page.locator('//nav[contains(@class,"main-menu horizontal")]');
  }

  /**
   * Click a top-level menu item by its exact text.
   * Example: await nav.click('Pay & Transfer')
   */
  async click(itemText: string): Promise<void> {
    await this.navRoot.locator(`.//span[text()="${itemText}"]`).first().click();
  }
}
