// Lightweight CSV export — no dependencies, works in the browser.
// Quotes any field that contains commas, quotes, or newlines; doubles
// internal quotes per RFC 4180. Excel handles the resulting file natively.

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.accessor(row))).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const csv = toCsv(rows, columns);
  // BOM so Excel reads UTF-8 (Arabic names etc.) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function timestampedFilename(base: string, ext = "csv"): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `${base}-${stamp}.${ext}`;
}
