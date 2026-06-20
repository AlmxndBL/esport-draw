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

// ─── CSV import ────────────────────────────────────────────────────────────────

/**
 * Parse CSV text into rows of cells. Handles quoted fields (with escaped `""`),
 * commas/newlines inside quotes, a UTF-8 BOM, and both \n and \r\n line endings.
 * Blank rows are dropped.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]!
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  // flush the final field/row (file may not end in a newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/**
 * Turn parsed CSV rows into {name, school} entries.
 * Detects a header row by known Thai/English column names; otherwise assumes
 * column 0 = team name, column 1 = school.
 */
export function teamsFromCsvRows(rows: string[][]): { name: string; school: string }[] {
  if (rows.length === 0) return []

  const nameKeys = ['ชื่อทีม', 'ทีม', 'name', 'team', 'team name', 'teamname']
  const schoolKeys = ['โรงเรียน', 'สถาบัน', 'school', 'institution', 'รร', 'ร.ร.']

  const first = rows[0]!.map((c) => c.trim().toLowerCase())
  const headerNameCol = first.findIndex((c) => nameKeys.includes(c))
  const headerSchoolCol = first.findIndex((c) => schoolKeys.includes(c))
  const hasHeader = headerNameCol >= 0 || headerSchoolCol >= 0

  const nameCol = headerNameCol >= 0 ? headerNameCol : 0
  const schoolCol = headerSchoolCol >= 0 ? headerSchoolCol : 1
  const start = hasHeader ? 1 : 0

  const out: { name: string; school: string }[] = []
  for (let i = start; i < rows.length; i++) {
    const r = rows[i]!
    const name = (r[nameCol] ?? '').trim()
    const school = (r[schoolCol] ?? '').trim()
    if (name && school) out.push({ name, school })
  }
  return out
}

/** A blank import template users can fill in (with a UTF-8 BOM for Excel + Thai). */
export function csvTemplate(): string {
  return toCsv([
    ['ชื่อทีม', 'โรงเรียน'],
    ['Dragon Squad', 'ร.ร.สวนกุหลาบ'],
    ['Phoenix Five', 'ร.ร.เตรียมอุดม'],
  ])
}
