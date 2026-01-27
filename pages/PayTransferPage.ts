import { Page, Locator } from '@playwright/test';
import { PayTransferNavigation } from '../Helpers/PayAndTransferNavigation'
import { TransferFormHandler } from '../Helpers/TransferFormHandler';
import { ConfirmationDialogVerifier } from '../Helpers/ConfirmationDetailsVerifiers';
import { OtpHandler } from '../Helpers/OtpHandler';
import { ReceiptHelper } from '../Helpers/RecieptHandler';
import { DialogActions } from '../Helpers/DialogHelper';
import { PopupErrorVerifier } from '../Helpers/ErrorPopupVerifiers';

export class PayTransfer {
  public readonly navigation: PayTransferNavigation;
  public readonly formHandler: TransferFormHandler;
  public readonly confirmationVerifier: ConfirmationDialogVerifier;
  public readonly otpHandler: OtpHandler;
  public readonly receipt: ReceiptHelper;
  public readonly dialog: DialogActions;

  constructor(private readonly page: Page) {
    this.navigation = new PayTransferNavigation(page);
    this.formHandler = new TransferFormHandler(page);
    this.confirmationVerifier = new ConfirmationDialogVerifier(page);
    this.otpHandler = new OtpHandler(page);
    this.receipt = new ReceiptHelper(page);
    this.dialog = new DialogActions(page);
  }
}

