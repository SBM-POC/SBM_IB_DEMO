export interface TransferFormData {
  senderNickname:string,
  senderAccount: string;
  amount: string;
  toAccount: string;
  paymentDate: string;
  remarks: string;
  currency: string;
  errMsgAmount: string,
  errMsgACNo: string,
  errMsgRemarks: string,
  errMsgSameAccount: string
  exchangeRateType: string
}
