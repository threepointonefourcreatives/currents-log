/**
 * Escape a value for CSV and neutralise spreadsheet formula injection:
 * a note like `=HYPERLINK("http://evil")` would otherwise run as a formula
 * when the export is opened in Excel / Google Sheets.
 */
export function csvCell(value: unknown): string {
  let v = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return '"' + v.replace(/"/g, '""') + '"';
}
