import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { useNotice } from './Notice.jsx'

// Free entry: a name is enough. No password, no account.
export default function Entry() {
  const { join, setIdentity } = useApp()
  const notify = useNotice()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function asParticipant(e) {
    e.preventDefault()
    if (name.trim().length < 2) { notify('כתבו שם של שתי אותיות לפחות.'); return }
    setBusy(true)
    try { await join(name.trim()) } catch { notify('ההצטרפות נכשלה. נסו שוב בעוד רגע.') } finally { setBusy(false) }
  }

  return (
    <motion.div className="entry" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <form className="entry-card" onSubmit={asParticipant}>
        <span className="eyebrow">01 · משתתף</span>
        <label className="field">
          <span>השם שלך</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: נועה כהן" maxLength={80} data-testid="join-name" />
        </label>
        <button className="btn ink lg" disabled={busy} data-testid="join">כניסה למסלול</button>
        <p className="muted small">בלי סיסמה. אחרי הכניסה יש קישור אישי לחזרה מכל מכשיר.</p>
      </form>
      <div className="entry-card alt">
        <span className="eyebrow">02 · מנטור</span>
        <p>תור בדיקה, טבלת קבוצה ועריכת תוכן השלבים.</p>
        <button className="btn lg" onClick={() => setIdentity({ role: 'mentor', name: name.trim() || 'מנטור' })} data-testid="as-mentor">
          כניסה כמנטור
        </button>
      </div>
    </motion.div>
  )
}
