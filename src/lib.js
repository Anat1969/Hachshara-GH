export const STATUS_LABEL = {
  none: 'לא התחיל',
  draft: 'טיוטה',
  submitted: 'ממתין לבדיקה',
  approved: 'אושר',
  returned: 'לתיקון',
}

export const SECTOR_LABEL = { culture: 'תרבות', municipality: 'עירייה', other: 'אחר' }

export function dueDate(startsOn, dueWeek) {
  if (!startsOn) return null
  const d = new Date(startsOn + 'T00:00:00')
  d.setDate(d.getDate() + dueWeek * 7 - 1)
  return d
}

export function fmtDate(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function daysLeft(d) {
  if (!d) return null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((d - now) / 86400000)
}

export function stageNumber(id) {
  return String(id).padStart(2, '0')
}
