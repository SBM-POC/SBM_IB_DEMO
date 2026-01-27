import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'querystring';

export function readCsvData(filename: string): Record<string, string>[] {
  // Ensure filename has .csv extension
    const csvFilename = path.resolve(__dirname,'..', 'Data', filename);

  if (!fs.existsSync(csvFilename)) {
    throw new Error(`CSV file not found at path: ${csvFilename}`);
  }
  const raw = fs.readFileSync(csvFilename, 'utf8').replace(/^\uFEFF/, '');
  const firstLine = raw.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';


  // Provide a generic type to parse to avoid 'unknown[]'
  const records = parse<Record<string, string>>(raw, {
    columns: (header: string[]) => header.map((h: string) => h.trim().replace(/^\uFEFF/, '')),
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });

  return records;
}

export function updateCsvCell(
  filename: string,
  rowIndex: number,        // 0-based index for the row
  columnName: string,      // column header
  newValue: string
): void {
  const csvPath = path.resolve(__dirname, '..', 'Data', filename);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at path: ${csvPath}`);
  }

  // Read CSV
  let csvData = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const delimiter = csvData.includes(';') ? ';' : ',';

  // Provide a generic type to parse to avoid 'unknown[]'
  let rows = csvData.split('\n').map(row => row.split(delimiter));

  const headers = rows[0];
  const targetCol = headers.indexOf(columnName);


  // Update the cell
  rows[rowIndex][targetCol] = newValue;

  csvData = rows.map(row => row.join(delimiter)).join('\n');
  fs.writeFileSync(csvPath, csvData, 'utf-8');
}




