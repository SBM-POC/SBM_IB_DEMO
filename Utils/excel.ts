// Utils/csv.ts
import * as fs from 'fs';

export interface RechargeRow {
  username: string;
  password: string;
  fromAccount: string;
  transferTo: string;
  currency: string;
  amount: string;
  remarks: string;
}

export function loadRechargeCsv(filePath: string): RechargeRow[] {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const idx = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const iUser = idx('Username');
  const iPass = idx('Password');
  const iFrom = idx('From_Account_Number');
  const iTo   = idx('Transfer_To');
  const iCur  = idx('Currency');
  const iAmt  = idx('Amount');
  const iRem  = idx('Remarks');

  const rows: RechargeRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const g = (ix: number) => (ix >= 0 && ix < cols.length ? cols[ix] : '');
    rows.push({
      username: g(iUser),
      password: g(iPass),
      fromAccount: g(iFrom),
      transferTo: g(iTo),
      currency: g(iCur),
      amount: g(iAmt),
      remarks: g(iRem),
    });
  }
  return rows;
}
