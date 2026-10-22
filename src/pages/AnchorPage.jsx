import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { rpc } from '../supabase.js'
import { Badge } from '../components/States.jsx'
import { useNotice } from '../components/Notice.jsx'
import { SECTOR_LABEL } from '../lib.js'

export default function AnchorPage() {
  const { data, reload, identity } = useApp()
  const notify = useNotice()
  const a = data.anchor
  const [form, setForm] = useState(() => ({
    org_name: a?.org_name || '',
    sector: a?.sector || 'culture',
    contact_name: a?.contact_name || '',
    pains: [0, 1, 2].map((i) => a?.pain_points?.[i] || ''),
  }))
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')
  const status = a?.status || 'none'
  const locked = status === 'submitted' || status === 'approved'
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setPain = (i, v) => setForm((f) => ({ ...f, pains: f.pains.map((p, j) => (j === i ? v : p)) }))

  async function save(nextStatus) {
    if (!form.org_name.trim()) { notify('צריך לכתוב את שם הארגון.'); return }
    if (nextStatus === 'submitted' && (!form.contact_name.trim() || form.pains.some((p) => !p.trim()))) {
      notify('כדי להגיש צריך איש קשר ושלושה תהליכים כואבים.')
      return
    }
    setBusy(true)
    try {
      await rpc('cgh_save_anchor', {
        p_key: identity.key, p_org: form.org_name.trim(), p_sector: form.sector, p_contact: form.contact_name.trim(),
        p_pains: form.pains.map((p) => p.trim()), p_status: nextStatus,
      })
      setSaved(nextStatus === 'submitted' ? 'הוגש למנטור' : 'נשמר כטיוטה')
      await reload()
    } catch { notify('השמירה נכשלה. נסו שוב.') } finally { setBusy(false) }
  }

  async function cancel() {
    setBusy(true)
    try {
      await rpc('cgh_save_anchor', {
        p_key: identity.key, p_org: a.org_name, p_sector: a.sector, p_contact: a.contact_name, p_pains: a.pain_points, p_status: 'draft',
      })
      setSaved('ההגשה בוטלה, אפשר לערוך'); await reload()
    } catch { notify('ביטול ההגשה נכשל.') } finally { setBusy(false) }
  }

  return (
    <div className="form-page">
      <section className="stage-hero">
        <span className="eyebrow">שלב 0 · שבוע 1</span>
        <h1>ארגון העוגן</h1>
        <p className="lead">ארגון אמיתי מתחום התרבות או העירייה, שמוכן ללוות אותך לאורך המסלול. בלי ארגון מאושר לא עוברים לשלב הבנייה.</p>
        <Badge status={status} />
      </section>

      {status === 'returned' && a?.mentor_note && (
        <div className="mentor-note" data-testid="anchor-note"><span className="eyebrow">הערת המנטור</span><p>{a.mentor_note}</p></div>
      )}
      {status === 'approved' && (
        <div className="mentor-note ok"><span className="eyebrow">אושר</span><p>הארגון אושר ויופיע בכל התוצרים הבאים.{a.mentor_note ? ` ${a.mentor_note}` : ''}</p></div>
      )}

      <div className="anchor-grid">
      <motion.form className="card form" onSubmit={(e) => e.preventDefault()} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <label className="field">
          <span>שם הארגון</span>
          <input value={form.org_name} onChange={(e) => set('org_name', e.target.value)} disabled={locked} data-testid="org-name" />
        </label>
        <fieldset className="field" disabled={locked}>
          <legend>תחום</legend>
          <div className="segmented">
            {Object.entries(SECTOR_LABEL).map(([k, label]) => (
              <button type="button" key={k} className={form.sector === k ? 'on' : ''} onClick={() => set('sector', k)} aria-pressed={form.sector === k} data-testid={`sector-${k}`}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>איש קשר בארגון</span>
          <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} disabled={locked} data-testid="contact" />
        </label>
        {form.pains.map((p, i) => (
          <label className="field" key={i}>
            <span>תהליך כואב {i + 1}</span>
            <textarea rows={2} value={p} onChange={(e) => setPain(i, e.target.value)} disabled={locked} data-testid={`pain-${i}`}
              placeholder={['למשל: הרשמה לחוגים נעשית בטלפון ובאקסל', 'למשל: פניות ציבור מגיעות בכמה ערוצים בלי מעקב', 'למשל: ארכיון תמונות שאי אפשר לחפש בו'][i]} />
          </label>
        ))}
        <div className="editor-actions">
          {(status === 'none' || status === 'draft' || status === 'returned') && (
            <>
              <button type="button" className="btn" disabled={busy} onClick={() => save('draft')} data-testid="anchor-draft">שמירת טיוטה</button>
              <button type="button" className="btn ink" disabled={busy} onClick={() => save('submitted')} data-testid="anchor-submit">הגשה למנטור</button>
            </>
          )}
          {status === 'submitted' && <button type="button" className="btn" disabled={busy} onClick={cancel} data-testid="anchor-cancel">ביטול הגשה לעריכה</button>}
          <AnimatePresence mode="wait">{saved && <motion.span key={saved} className="saved mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{saved}</motion.span>}</AnimatePresence>
        </div>
      </motion.form>
      <AnchorPreview form={form} />
      </div>
    </div>
  )
}

// Live model of the organisation: name on top, three pains as blocks that grow with what is written.
function AnchorPreview({ form }) {
  const pains = form.pains.map((p) => p.trim())
  const max = Math.max(40, ...pains.map((p) => p.length))
  return (
    <aside className="anchor-preview" aria-label="תצוגה חיה של הארגון">
      <span className="eyebrow">תצוגה חיה</span>
      <motion.div className="org-block" layout>
        <span className="mono">{SECTOR_LABEL[form.sector]}</span>
        <strong>{form.org_name.trim() || 'שם הארגון'}</strong>
        {form.contact_name.trim() && <span className="muted">איש קשר: {form.contact_name.trim()}</span>}
      </motion.div>
      <div className="pains">
        {pains.map((p, i) => (
          <div className="pain" key={i}>
            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
            <div className="pain-bar">
              <motion.span className={p ? 'on' : ''} animate={{ width: `${Math.max(6, (p.length / max) * 100)}%` }} transition={{ type: 'spring', stiffness: 160, damping: 22 }} />
            </div>
            <p>{p || 'תהליך כואב'}</p>
          </div>
        ))}
      </div>
      <p className="muted small">שלושת התהליכים הם חומר הגלם לשלב הבא: בוחרים אחד וממפים אותו.</p>
    </aside>
  )
}
