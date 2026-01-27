import { Page, expect } from '@playwright/test';
import { utilityLibrary } from '../Utils/utilityLibrary';

export class ProfileSettingsPage {
  private readonly page: Page;
  private readonly utility: utilityLibrary;

  constructor(page: Page) {
    this.page = page;
    this.utility = new utilityLibrary(page);
  }

  // Navigate to Settings → Profile Settings → Currency panel

  async goToProfileSettings(): Promise<void> {
    // Click Settings button (desktop or mobile)
    let settingsButton = this.page.locator('#SETTINGS_hor');
    if (!(await settingsButton.isVisible())) settingsButton = this.page.locator('#SETTINGS_mob');
    await this.utility.isVisible(this.page, settingsButton, 'Settings button');
    await settingsButton.click();

    // Select Profile Settings (desktop or mobile)
    let profileOption = this.page.locator('#profile_hor');
    if (!(await profileOption.isVisible())) profileOption = this.page.locator('#profile_mob');
    await this.utility.isVisible(this.page, profileOption, 'Profile Settings option');
    await profileOption.click();
  }

  async goToCurrencyPanel(): Promise<void> {
    // Click Settings button (desktop or mobile)
    let settingsButton = this.page.locator('#SETTINGS_hor');
    if (!(await settingsButton.isVisible())) settingsButton = this.page.locator('#SETTINGS_mob');
    await this.utility.isVisible(this.page, settingsButton, 'Settings button');
    await settingsButton.click();

    // Select Profile Settings (desktop or mobile)
    let profileOption = this.page.locator('#profile_hor');
    if (!(await profileOption.isVisible())) profileOption = this.page.locator('#profile_mob');
    await this.utility.isVisible(this.page, profileOption, 'Profile Settings option');
    await profileOption.click();

    // Ensure Currency panel is visible
    const currencyHeader = this.page.getByRole('heading', { name: 'Currency' });
    await currencyHeader.scrollIntoViewIfNeeded();
    if (!(await currencyHeader.isVisible())) await this.page.mouse.wheel(0, 800);
    await this.utility.isVisible(this.page, currencyHeader, 'Currency panel header');
    await currencyHeader.click();
  }

  // Select a new currency from dropdown
  async selectCurrency(newCurrency?: string): Promise<string> {
    const currencySelect = this.page.locator('mat-select[formcontrolname="currency"]');
    await currencySelect.click();
    const panel = this.page.locator('#BW_select_currency-panel');
    await panel.waitFor({ state: 'visible', timeout: 5000 });

    // Get current selected currency
    const selectedCurrency = (await currencySelect.locator('span.mat-mdc-select-min-line').innerText()).trim();

    // Pick a new currency if not provided
    const options = panel.locator('mat-option span.mdc-list-item__primary-text');
    const count = await options.count();
    let chosenCurrency = newCurrency ?? null;

    for (let i = 0; i < count; i++) {
      const text = (await options.nth(i).innerText()).trim();
      if (text !== selectedCurrency) {
        chosenCurrency = text;
        await options.nth(i).click();
        break;
      }
    }

    if (!chosenCurrency) throw new Error("No alternative currency found to select.");

    // Click Update Currency button
    await this.page.locator('#BW_button_update_currency').click();

    // Wait for toast message
    const toast = this.page.locator('div.wrapper p:has-text("Your request has been submitted successfully.")');
    await expect(toast).toBeVisible({ timeout: 5000 });

    return chosenCurrency;
  }

  // Verify panel description shows selected currency
  async verifyCurrencyPanelDescription(currency: string): Promise<void> {
    const currencyHeader = this.page
      .locator('mat-expansion-panel-header:has(h3.panel-title:text("Currency"))')
      .first();

    const expanded = await currencyHeader.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await currencyHeader.click();
      await this.page.waitForTimeout(500);
    }

    const description = currencyHeader.locator('mat-panel-description p');
    await expect(description).toContainText(currency, { timeout: 50000 });
  }

  // Verify My Accounts balances updated
  async verifyMyAccountsCurrency(expectedCurrencySymbol: string): Promise<void> {
    const myAccountsMenu = this.page.locator('#retail-home_hor > a.menu-link');
    await this.utility.isVisible(this.page, myAccountsMenu, 'My Accounts top-level menu');
    await myAccountsMenu.click();

    const accountBalancesLocator = this.page.locator('app-amount.balance-amount');

    await expect.poll(async () => {
      const balances = await accountBalancesLocator.allTextContents();
      return balances.every(balance => balance.includes(expectedCurrencySymbol));
    }, {
      timeout: 30000,
      message: `Balances did not update to ${expectedCurrencySymbol} within 30 seconds`
    }).toBe(true);
  }

  //--Language Options
  async goToLanguagePanel(): Promise<void> {
    const languageHeader = this.page.getByRole('heading', { name: 'Language' });
    await languageHeader.scrollIntoViewIfNeeded();
    if (!(await languageHeader.isVisible())) await this.page.mouse.wheel(0, 800);
    await this.utility.isVisible(this.page, languageHeader, 'Language panel header');
    await languageHeader.click();
  }

  async openPanel(panelName: string): Promise<void> {
    const header = this.page.locator(`mat-expansion-panel-header:has(h3.panel-title:text("${panelName}"))`).first();
    await header.scrollIntoViewIfNeeded();
    const expanded = await header.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await header.click();
      await this.page.waitForTimeout(500); // wait for panel animation
    }
  }


  // -----------------------------
  // Dropdown Selection
  // -----------------------------
  async selectDropdownOption(selectLocator: string, panelLocator: string): Promise<string> {
    const dropdown = this.page.locator(selectLocator);
    await dropdown.click();

    const panel = this.page.locator(panelLocator);
    await panel.waitFor({ state: 'visible', timeout: 5000 });

    const currentValue = (await dropdown.locator('span.mat-mdc-select-min-line').innerText()).trim();
    const options = panel.locator('mat-option span.mdc-list-item__primary-text');
    const count = await options.count();

    for (let i = 0; i < count; i++) {
      const text = (await options.nth(i).innerText()).trim();
      if (text !== currentValue) {
        await options.nth(i).click();
        return text;
      }
    }

    throw new Error('No alternative option found in dropdown.');
  }

  // -----------------------------
  // Buttons & Toasts
  // -----------------------------
  async clickButton(selector: string): Promise<void> {
    const button = this.page.locator(selector);
    await this.utility.isVisible(this.page, button, `Button ${selector}`);
    await button.click();
  }

  async verifyToast(message: string): Promise<void> {
    const toast = this.page.locator(`div.wrapper p:has-text("${message}")`);
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  // -----------------------------
  // Panel Verifications
  // -----------------------------
  async verifyPanelDescription(panelTitle: string, expectedText: string): Promise<void> {
    const panelHeader = this.page.locator(`mat-expansion-panel-header:has(h3.panel-title:text("${panelTitle}"))`).first();
    const expanded = await panelHeader.getAttribute('aria-expanded');
    if (expanded !== 'true') await panelHeader.click();

    let description = panelHeader.locator('mat-panel-description p');
    if (!(await description.count())) description = panelHeader.locator('p.description');

    await expect(description).toContainText(expectedText, { timeout: 5000 });
  }

  // -----------------------------
  // Account Titles Extraction
  // -----------------------------
  async getAccountTitlesFromMyAccounts(): Promise<string[]> {
    const myAccountsMenu = this.page.locator('#retail-home_hor > a.menu-link');
    await this.utility.isVisible(this.page, myAccountsMenu, 'My Accounts top-level menu');
    await myAccountsMenu.click();

    const myAccountsSubmenu = this.page.locator('#retail-home_hor ul.sub-menu-1');
    if ((await myAccountsSubmenu.count()) > 0) await expect(myAccountsSubmenu).toBeVisible({ timeout: 5000 });

    const firstAccountLink = myAccountsSubmenu.locator('li a.menu-link').first();
    if ((await firstAccountLink.count()) > 0) await firstAccountLink.click();

    const accountTitlesLocator = this.page.locator('mat-expansion-panel .acc-name .mat-subtitle-2');
    const count = await accountTitlesLocator.count();
    if (count === 0) throw new Error('No account titles found.');

    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = (await accountTitlesLocator.nth(i).textContent())?.trim();
      if (title) titles.push(title);
    }
    return titles;
  }

  // -----------------------------
  // SMS Account Panel Methods
  // -----------------------------
  async openSmsAccountPanel(): Promise<void> {
    const smsHeader = this.page.getByRole('heading', { name: 'SMS Account' });
    await this.utility.isVisible(this.page, smsHeader, 'SMS Account panel header');
    await smsHeader.scrollIntoViewIfNeeded();
    if (!(await smsHeader.isVisible())) await this.page.mouse.wheel(0, 800);

    const expanded = await smsHeader.getAttribute('aria-expanded');
    if (expanded !== 'true') await smsHeader.click();
  }

  async selectDefaultAccount(accountToSelect?: string): Promise<string> {
    const accountSelect = this.page.locator('mat-select[formcontrolname="accountsControl"]');
    await accountSelect.click();

    const panel = this.page.locator('#BW_select_accountsControl-panel');
    await panel.waitFor({ state: 'visible', timeout: 10000 });

    const options = panel.locator('mat-option span.mdc-list-item__primary-text');
    const count = await options.count();

    // Determine selected account
    let selectedText = await accountSelect.locator(
      'span.mat-mdc-select-value-text, span.mdc-select__selected-text, span.mat-select-value-text'
    ).innerText().catch(() => '');
    selectedText = (selectedText || '').trim();

    let newAccount: string | null = null;

    if (accountToSelect) {
      newAccount = accountToSelect;
    } else {
      // Pick first different option
      for (let i = 0; i < count; i++) {
        const text = (await options.nth(i).innerText()).trim();
        if (text !== selectedText) {
          newAccount = text;
          break;
        }
      }
    }

    if (!newAccount) throw new Error("Could not determine any account to select.");

    // Click the chosen option
    await this.page.evaluate((t) => {
      const list = document.querySelectorAll(
        '#BW_select_accountsControl-panel mat-option span.mdc-list-item__primary-text'
      );
      for (const el of list) {
        const html = el as HTMLElement;
        if (html.textContent?.trim() === t) html.click();
      }
    }, newAccount);

    // Click Update
    await this.page.locator('#BW_button_update_sms_account').click();
    return newAccount;
  }

  async verifySmsAccountDescription(account: string): Promise<void> {
    const smsHeader = this.page
      .locator('mat-expansion-panel-header:has(h3.panel-title:text("SMS Account"))')
      .first();

    const expanded = await smsHeader.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await smsHeader.click();
      await this.page.waitForTimeout(500);
    }

    const smsDescription = smsHeader.locator('mat-panel-description p');
    await expect(smsDescription).toContainText(account, { timeout: 50000 });
  }
  
  async expandPanel(panelName:string)
  {
    const panelExpandButton=this.page.locator(`xpath=//h3[contains(text(),'${panelName}')]//ancestor::mat-expansion-panel-header[contains(@class,'show-gt-sm')]/span/mat-icon`);
    await panelExpandButton.waitFor({ state: 'visible' });
    await panelExpandButton.click();
    await expect(this.page.locator(`xpath=//h3[contains(text(),'${panelName}')]//ancestor::mat-expansion-panel`)).toHaveClass(/mat-expanded/);
  }

  async SelectCurrencyAndSave(currencyEng:string, currencyFrench:string)
  { 
    const ddlCurrency = this.page.locator(`xpath=//mat-select[@id="BW_select_currency"]`);
    const btnSaveCurrency = this.page.locator(`xpath=//button[@id="BW_button_update_currency"]`)

    if (currencyEng.trim().length > 0) {
            await ddlCurrency.click();
            const optionToSelect = await this.page.locator(`xpath=//mat-option[contains(text(),'${currencyEng}') or contains(text(), '${currencyFrench}')]`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
            await btnSaveCurrency.waitFor({ state: 'visible' });
    await btnSaveCurrency.click();      
      
  }

  async GetAllAccountTypePanelNetBalance(): Promise<string[]>
  {
    const allAccountPanels = this.page.locator(`xpath=//app-account-list//div[contains(@class,'account_list')]//div[contains(@class,'acc_group_value')]`);
      const texts = await allAccountPanels.allInnerTexts();
      return texts.map(t => t.trim());    
    
  }

  async SelectAccountAndSave(accountNum:string)
  { 
    const ddlAccount = this.page.locator(`xpath=//mat-select[@id="BW_select_accountsControl"]`);
    const btnSaveAccount = this.page.locator(`xpath=//button[@id="BW_button_update_sms_account"]`)

    if (accountNum.trim().length > 0) {
            await ddlAccount.click();
            const optionToSelect = await this.page.locator(`mat-option:has-text("${accountNum}")`);
            await optionToSelect.scrollIntoViewIfNeeded();
            await optionToSelect.click();
        }
            await btnSaveAccount.waitFor({ state: 'visible' });
    await btnSaveAccount.click();      
      
  }
  async SelectLanguageAndSave(): Promise<string>
  { 
    const currentLanguagePanelDescr= this.page.locator(`xpath=//h3[contains(text(),'Language')]//ancestor::mat-expansion-panel-header[contains(@class,'show-gt-sm')]//p`).innerText();
    const ddlLanguage = this.page.locator(`xpath=//mat-select[@id="BW_select_locale"]`);
    const btnSaveLanguage = this.page.locator(`xpath=//button[@id="BW_button_update_language"]`);
    let setUpLanguage;    
    if ((await currentLanguagePanelDescr).trim().includes("French"))
    {
      await ddlLanguage.click();
      const optionToSelect = await this.page.locator(`xpath=//mat-option//span[contains(text(),'Anglais') or contains(text(), 'English')]`);
      await optionToSelect.click();    
      setUpLanguage="English";
    }
    else
    {
      await ddlLanguage.click();
      const optionToSelect = await this.page.locator(`xpath=//mat-option//span[contains(text(),'French')]`);
      await optionToSelect.click();   
      setUpLanguage="French"; 
    }           
    await btnSaveLanguage.waitFor({ state: 'visible' });
    await btnSaveLanguage.click();    
    return setUpLanguage;  
      
  }
  
  async GetCurrentDropdownValue(): Promise<string>
  {
    const ddlAccount = this.page.locator(`xpath=//mat-label[normalize-space()="From Account"]/ancestor::mat-form-field//mat-select//p[contains(@class,'acc-number')]`);
    const currentAccVal = (await ddlAccount.innerText()).trim();      
    return currentAccVal;    
  }

  async CheckLanguageOnDashboard(accountTitle:string, accountType:string)
  {
    const ddlAccount = this.page.locator(`xpath=//mat-label[normalize-space()="From Account"]/ancestor::mat-form-field//mat-select//p[contains(@class,'acc-number')]`);
    const currentAccVal = (await ddlAccount.innerText()).trim();      
  }

  
  async GetAllAccountTitle(accountType:string): Promise<string[]>
  {
    const allAccountTitles = this.page.locator(`xpath=//div[contains(text(),'${accountType}')]//ancestor::div[contains(@class,'account_list')]//a`);
      const texts = await allAccountTitles.allInnerTexts();
      return texts.map(t => t.trim()); 
    
  }

}
