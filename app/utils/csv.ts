type Cell = string | number

/** Escape one CSV cell: quote when it contains a comma, quote, or newline. */
export function csvCell(value: Cell): string {
  const s = String(value ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Build a CSV string from rows.
 * Prepends a UTF-8 BOM so Excel reads Thai correctly, and uses \r\n endings.
 */
export function toCsv(rows: Cell[][]): string {
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** Timestamped filename, e.g. esport-brackets-20260619-2310.csv */
export function csvFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `esport-brackets-${date.getFullYear()}${p(date.getMonth() + 1)}${p(
    date.getDate(),
  )}-${p(date.getHours())}${p(date.getMinutes())}.csv`
}

/** Trigger a client-side file download. No-op on the server. */
export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8;'): void {
  if (!import.meta.client) return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
