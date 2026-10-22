import { useState } from 'react'
import { useApp } from '../store.jsx'
import { supabase, must } from '../supabase.js'
import { buildRows } from '../mentor.js'
import { useNotice } from './SignIn.jsx'

// Shown only when every deliverable of the participant's current stage is approved.
export default function AdvanceButton({ enrollmentId }) {
  const { course, data, reload } = useApp()
  const notify = useNotice()
  const [busy, setBusy] = useState(false)
  const row = buildRows(course, data).find((r) => r.e.id === enrollmentId)
  if (!row?.ready) return null
  async function advance() {
    setBusy(true)
    try {
      await supabase.rpc('cgh_advance_stage', { p_enrollment: enrollmentId }).then(must)
      await reload()
      notify(`${row.name} עבר לשלב ${row.e.current_stage + 1}.`)
    } catch { notify('המעבר לשלב הבא נכשל.') } finally { setBusy(false) }
  }
  return (
    <button className="btn accent" disabled={busy} onClick={advance} data-testid={`advance-${enrollmentId}`}>
      מעבר לשלב {row.e.current_stage + 1}
    </button>
  )
}
