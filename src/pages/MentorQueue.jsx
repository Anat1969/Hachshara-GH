import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { supabase, must } from '../supabase.js'
import { buildQueue } from '../mentor.js'
import { Loading, Empty } from '../components/States.jsx'
import { useNotice } from '../components/SignIn.jsx'
import { fmtDate, stageNumber, SECTOR_LABEL } from '../lib.js'
import AdvanceButton from '../components/AdvanceButton.jsx'

export default function MentorQueue() {
  const { course, data } = useApp()
  const [params, setParams] = useSearchParams()
  const [lastDecided, setLastDecided] = useState(null)
  if (!course) return <Loading />
  const queue = buildQueue(course, data)
  const openKey = params.get('item')
  const toggle = (k) => {
    const p = new URLSearchParams(params)
    if (openKey === k) p.delete('item'); else p.set('item', k)
    setParams(p, { replace: true })
  }

  return (
    <div className="queue">
      <section className="hello">
        <span className="eyebrow">תור בדיקה</span>
        <h1>{queue.length ? `${queue.length} ממתינים` : 'התור ריק'}</h1>
        <p className="lead">ממוין לפי מועד ההגשה, הישן ראשון.</p>
      </section>

      <AnimatePresence>
        {lastDecided?.row && (
          <motion.div className="mentor-note ok" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="eyebrow">{lastDecided.decision === 'approved' ? 'אושר' : 'הוחזר לתיקון'}</span>
            <p>{lastDecided.who}: {lastDecided.title}</p>
            <AdvanceButton enrollmentId={lastDecided.row.e.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {queue.length === 0 ? (
        <Empty title="אין מה לבדוק כרגע" text="כשמשתתף יגיש תוצר הוא יופיע כאן. אפשר לעבור לטבלת הקבוצה כדי לראות מי מתעכב." />
      ) : (
        <ul className="deliverables">
          {queue.map((it) => (
            <li key={it.key} className={`deliv ${openKey === it.key ? 'open' : ''}`}>
              <button className="deliv-head" onClick={() => toggle(it.key)} aria-expanded={openKey === it.key} data-testid={`q-${it.key}`}>
                <span className="mono">{stageNumber(it.stageId ?? 0)}</span>
                <div><strong>{it.who}</strong><p>{it.title}</p></div>
                <span className="mono muted">{fmtDate(it.at)}</span>
              </button>
              <AnimatePresence initial={false}>
                {openKey === it.key && (
                  <motion.div className="deliv-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <ReviewPanel item={it} onDone={(decision) => { setLastDecided({ ...it, decision }); toggle(it.key) }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReviewPanel({ item, onDone }) {
  const { reload } = useApp()
  const notify = useNotice()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function decide(decision) {
    if (decision === 'returned' && !note.trim()) { notify('בהחזרה לתיקון צריך לכתוב הערה למשתתף.'); return }
    setBusy(true)
    try {
      const fn = item.kind === 'anchor' ? 'cgh_review_anchor' : 'cgh_review_submission'
      const args = item.kind === 'anchor'
        ? { p_anchor: item.id, p_decision: decision, p_note: note.trim() }
        : { p_submission: item.id, p_decision: decision, p_note: note.trim() }
      await supabase.rpc(fn, args).then(must)
      await reload()
      onDone(decision)
    } catch { notify('שמירת ההחלטה נכשלה. נסו שוב.') } finally { setBusy(false) }
  }

  return (
    <div className="editor">
      {item.kind === 'anchor' ? (
        <dl className="facts">
          <dt>ארגון</dt><dd>{item.anchor.org_name}</dd>
          <dt>תחום</dt><dd>{SECTOR_LABEL[item.anchor.sector]}</dd>
          <dt>איש קשר</dt><dd>{item.anchor.contact_name}</dd>
          <dt>תהליכים כואבים</dt>
          <dd><ol>{(item.anchor.pain_points || []).map((p, i) => <li key={i}>{p}</li>)}</ol></dd>
        </dl>
      ) : (
        <div className="submitted-content">
          <p>{item.content || <span className="muted">ללא טקסט</span>}</p>
          {item.link && <a href={item.link} target="_blank" rel="noreferrer" dir="ltr" className="mono">{item.link}</a>}
        </div>
      )}
      <label className="field">
        <span>הערה למשתתף</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="חובה בהחזרה לתיקון, רשות באישור." data-testid="review-note" />
      </label>
      <div className="editor-actions">
        <button className="btn solid" disabled={busy} onClick={() => decide('approved')} data-testid="approve">אושר</button>
        <button className="btn line" disabled={busy} onClick={() => decide('returned')} data-testid="return">לתיקון</button>
      </div>
    </div>
  )
}
