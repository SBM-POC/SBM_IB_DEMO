import { Page, Locator, expect } from '@playwright/test';
import { utilityLibrary } from '../Utils/utilityLibrary';

export class PreLoginPage {
  private readonly page: Page;
  private readonly utility: utilityLibrary;

  constructor(page: Page) {
    this.page = page;
    this.utility = new utilityLibrary(page);
  }

  /* -----------------------------
   * Promo Cards
   * ----------------------------- */
  async validatePromoCards(cards: string[]): Promise<void> {
    for (const card of cards) {
      const promoButton = this.page
        .locator('mat-card')
        .filter({ hasText: card })
        .getByRole('button', { name: /Find out more|Sign up now/i });

      await this.utility.isElementVisible(
        promoButton,
        "UAT Promo Card",
        card
      );
    }
  }

  /* -----------------------------
   * Footer Links
   * ----------------------------- */
  async validateFooterLinks(labels: string[]): Promise<void> {
    for (const label of labels) {
      const footerLink = this.page.getByRole('link', { name: new RegExp(label, 'i') });
      await this.utility.isVisible(this.page, footerLink, `${label} footer link`);
    }
  }

  /* -----------------------------
   * Contact Us Page
   * ----------------------------- */
  async openContactUs(): Promise<void> {
    const contactLink = this.page.getByRole('link', { name: /Contact Us/i });
    await this.utility.isVisible(this.page, contactLink, "Contact Us link");
    await contactLink.click();
    await expect(this.page).toHaveURL(/contact/i);
  }

  async extractContactUsDetails(): Promise<any> {
    const heading = this.page.locator('text=Contact Us').first();
    await this.utility.isVisible(this.page, heading, "Contact Us heading");

    const infoBlock = this.page.locator('*').filter({ hasText: 'Address' }).first();
    await infoBlock.waitFor({ state: 'visible', timeout: 10000 });

    const fullText = await infoBlock.innerText();
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

    const labels = [
      'Address',
      'Customer Service',
      'SWIFT Code',
      'Business Registration Number',
      'Branch Opening Hours'
    ];

    const extracted: any = {};

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const startIdx = lines.findIndex(l => l === label);
      const endIdx = i + 1 < labels.length
        ? lines.findIndex(l => l === labels[i + 1])
        : lines.length;

      if (startIdx === -1) continue;

      const values = lines.slice(startIdx + 1, endIdx);

      if (label === "Customer Service") {
        extracted.customerService = {
          phone: values[0] ?? "",
          fax: values[1] ?? "",
          email: values.find(v => v.includes('@')) ?? ""
        };
      }
      else if (label === "Branch Opening Hours") {
        const hours: any = {};
        let day = "";

        for (const line of values) {
          if (line.match(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/i)) {
            day = line;
          } else if (day) {
            hours[day] = line;
            day = "";
          }
        }
        extracted.branchOpeningHours = hours;
      }
      else {
        extracted[label.replace(/ /g, '').toLowerCase()] = values.join(", ");
      }
    }

    return extracted;
  }

  /* -----------------------------
   * Back to Login
   * ----------------------------- */
  async backToLogin(): Promise<void> {
    const backLink = this.page.getByRole('link', { name: /Back to Login/i });
    await this.utility.isVisible(this.page, backLink, "Back to Login link");
    await backLink.click();
    await expect(this.page).toHaveURL(/login|BWInternet380/i);
  }
}
