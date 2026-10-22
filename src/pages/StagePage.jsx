import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { rpc } from '../supabase.js'
import { Badge, Loading, ErrorState, Empty } from '../components/States.jsx'
import { useNotice } from '../components/Notice.jsx'
import { Pyramid, StageTrack } from '../components/viz.jsx'
import { dueDate, fmtDate, stageNumber } from '../lib.js'

export default function StagePage() {
  const { id } = useParams()
  const stageId = Number(id)
  const [params, setParams] = useSearchParams()
  const openId = params.get('d')
  const { course, courseError, reloadCourse, identity, data, status } = useApp()
  const [editing, setEditing] = useState(false)

  if (courseError) return <ErrorState onRetry={reloadCourse} />
  if (!course || (identity && status !== 'ready')) return <Loading />
  const stage = course.stages.find((s) => s.id === stageId)
  if (!stage) return <Empty title="השלב לא נמצא" text="אפשר לחזור לדף הבית ולבחור שלב מהמפה."><Link className="btn" to="/">לדף הבית</Link></Empty>

  const ds = course.deliverables.filter((d) => d.stage_id === stageId)
  const isMentor = identity?.role === 'mentor'
  const enrollment = !isMentor ? data?.enrollment : null
  const canWork = enrollment && stageId <= enrollment.current_stage
  const due = enrollment ? dueDate(enrollment.cohort?.starts_on, stage.due_week) : null
  const prev = course.stages.find((s) => s.id === stageId - 1)
  const next = course.stages.find((s) => s.id === stageId + 1)

  const toggle = (did) => {
    const p = new URLSearchParams(params)
    if (openId === did) p.delete('d'); else p.set('d', did)
    setParams(p, { replace: true })
  }

  return (
    <div className="stage-page">
      <section className="stage-hero">
        <span className="mono ghost-num" aria-hidden="true">{stageNumber(stage.id)}</span>
        <span className="eyebrow">שלב {stage.id} · {stage.weeks}{due ? ` · יעד ${fmtDate(due)}` : ''}</span>
        {editing ? <StageEditor stage={stage} /> : (
          <>
            <h1>{stage.title}</h1>
            <p className="lead">{stage.goal}</p>
          </>
        )}
        {enrollment && stageId > enrollment.current_stage && (
          <p className="notice-strip">השלב הזה ייפתח אחרי שהמנטור יאשר את השלבים הקודמים.</p>
        )}
        {enrollment && <StageTrack current={enrollment.current_stage} />}
        <Link className="ex-link small-link" to={`/example?s=${stage.id}`} data-testid="stage-example">
          <span className="mono">איך זה נראה בדוגמה</span>
          <span>שלב {stage.id} במקרה של הספרייה, עם תוצרים לדוגמה</span>
        </Link>
        {!identity && <p className="notice-strip">כדי להגיש תוצרים, נכנסים מדף הבית עם השם בלבד.</p>}
      </section>

      {stage.id === 3 && (
        <section className="section">
          <header className="section-head">
            <span className="eyebrow">כלי חשיבה</span>
            <h2>מהפתרון הפשוט אל המורכב</h2>
          </header>
          <Pyramid />
        </section>
      )}

      <section className="section">
        <header className="section-head">
          <span className="eyebrow">תוצרים</span>
          <h2>מה מגישים בשלב הזה</h2>
        </header>
        <ul className="deliverables rail">
          {stageId === 0 && (
            <li className="deliv">
              <div className="deliv-head static">
                <span className="mono">00</span>
                <div><strong>בחירת ארגון עוגן</strong><p>שם הארגון, תחום, איש קשר ושלושה תהליכים כואבים.</p></div>
                {enrollment && <Badge status={data.anchor?.status || 'none'} />}
              </div>
              {enrollment && <div className="deliv-foot"><Link className="btn" to="/anchor" data-testid="to-anchor">לטופס הארגון</Link></div>}
            </li>
          )}
          {ds.map((d, i) => {
            const sub = enrollment ? data.submissions.find((s) => s.deliverable_id === d.id) : null
            const open = openId === d.id
            return (
              <li key={d.id} className={`deliv ${open ? 'open' : ''}`}>
                {editing ? <DeliverableEditor d={d} n={i + 1} /> : (
                  <button className="deliv-head" onClick={() => toggle(d.id)} aria-expanded={open} data-testid={`deliv-${i + 1}`}>
                    <span className="mono">{stageNumber(i + 1)}</span>
                    <div><strong>{d.title}</strong><p>{d.description}</p></div>
                    {enrollment && <Badge status={sub?.status || 'none'} />}
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {open && !editing && enrollment && (
                    <motion.div className="deliv-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <SubmissionEditor deliverable={d} sub={sub} canWork={canWork} />
                    </motion.div>
                  )}
                  {open && !editing && !enrollment && (
                    <motion.div className="deliv-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <p className="muted pad">{isMentor ? 'הגשות המשתתפים מופיעות בתור הבדיקה.' : 'כדי להגיש תוצר נכנסים מדף הבית עם השם בלבד.'}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
          {editing && <AddDeliverable stageId={stageId} order={ds.length + 1} />}
        </ul>
      </section>

      <nav className="pager" aria-label="מעבר בין שלבים">
        {prev ? <Link className="btn" to={`/stage/${prev.id}`} data-testid="prev-stage">לשלב הקודם: {prev.title}</Link> : <span />}
        {next ? <Link className="btn" to={`/stage/${next.id}`} data-testid="next-stage">לשלב הבא: {next.title}</Link> : <span />}
      </nav>

      {isMentor && (
        <motion.div className="editbar" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <span className="mono">עריכת תוכן</span>
          <button className={`btn ${editing ? 'gold' : 'ink'}`} onClick={() => setEditing((e) => !e)} data-testid="edit-toggle">
            {editing ? 'סיום עריכה' : 'עריכת השלב'}
          </button>
        </motion.div>
      )}
    </div>
  )
}

function SubmissionEditor({ deliverable, sub, canWork }) {
  const { data, reload, identity } = useApp()
  const notify = useNotice()
  const [content, setContent] = useState(sub?.content || '')
  const [link, setLink] = useState(sub?.link || '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')
  useEffect(() => { setContent(sub?.content || ''); setLink(sub?.link || '') }, [sub?.id, sub?.status])

  const status = sub?.status || 'none'
  const locked = !canWork || status === 'submitted' || status === 'approved'
  const note = sub && data.reviews.find((r) => r.submission_id === sub.id)

  async function save(nextStatus) {
    if (nextStatus === 'submitted' && !content.trim() && !link.trim()) {
      notify('כדי להגיש צריך לכתוב תוכן או להוסיף קישור.')
      return
    }
    setBusy(true)
    try {
      await rpc('cgh_save_submission', {
        p_key: identity.key, p_deliverable: deliverable.id, p_content: content, p_link: link.trim(), p_status: nextStatus,
      })
      setSaved(nextStatus === 'submitted' ? 'הוגש לבדיקה' : 'נשמר כטיוטה')
      await reload()
    } catch {
      notify('השמירה נכשלה. נסו שוב.')
    } finally { setBusy(false) }
  }

  async function cancel() {
    setBusy(true)
    try {
      await rpc('cgh_save_submission', {
        p_key: identity.key, p_deliverable: deliverable.id, p_content: content, p_link: link.trim(), p_status: 'draft',
      })
      setSaved('ההגשה בוטלה, אפשר לערוך')
      await reload()
    } catch { notify('ביטול ההגשה נכשל. נסו שוב.') } finally { setBusy(false) }
  }

  return (
    <div className="editor">
      {status === 'returned' && note && (
        <div className="mentor-note" data-testid="mentor-note">
          <span className="eyebrow">הערת המנטור</span>
          <p>{note.note || 'התוצר הוחזר לתיקון.'}</p>
        </div>
      )}
      {status === 'approved' && note?.note && (
        <div className="mentor-note ok"><span className="eyebrow">הערת המנטור</span><p>{note.note}</p></div>
      )}
      <label className="field">
        <span>תוכן</span>
        <textarea rows={7} value={content} onChange={(e) => setContent(e.target.value)} disabled={locked}
          placeholder="כתבו כאן את התוצר, או הדביקו טקסט ממסמך." data-testid="sub-content" />
      </label>
      <label className="field">
        <span>קישור (לא חובה)</span>
        <input type="url" dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} disabled={locked}
          placeholder="https://" data-testid="sub-link" />
      </label>
      <div className="editor-actions">
        {!canWork && <span className="muted">השלב עדיין לא פתוח להגשה.</span>}
        {canWork && (status === 'none' || status === 'draft' || status === 'returned') && (
          <>
            <button className="btn" disabled={busy} onClick={() => save('draft')} data-testid="save-draft">שמירת טיוטה</button>
            <button className="btn ink" disabled={busy} onClick={() => save('submitted')} data-testid="submit">הגשה לבדיקה</button>
          </>
        )}
        {canWork && status === 'submitted' && (
          <button className="btn" disabled={busy} onClick={cancel} data-testid="cancel-submit">ביטול הגשה לעריכה</button>
        )}
        {status === 'approved' && <span className="muted">התוצר אושר ונעול.</span>}
        <AnimatePresence mode="wait">{saved && <motion.span key={saved} className="saved mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{saved}</motion.span>}</AnimatePresence>
      </div>
    </div>
  )
}

function StageEditor({ stage }) {
  const { reloadCourse } = useApp()
  const notify = useNotice()
  const [title, setTitle] = useState(stage.title)
  const [goal, setGoal] = useState(stage.goal)
  const [weeks, setWeeks] = useState(stage.weeks)
  async function save() {
    try {
      await rpc('cgh_save_stage', { p_id: stage.id, p_title: title, p_goal: goal, p_weeks: weeks })
      await reloadCourse(); notify('השלב נשמר.')
    } catch { notify('שמירת השלב נכשלה.') }
  }
  return (
    <div className="inline-edit">
      <input className="h1-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="שם השלב" data-testid="stage-title-input" />
      <textarea rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="מטרת השלב" />
      <input value={weeks} onChange={(e) => setWeeks(e.target.value)} aria-label="שבועות" />
      <button className="btn ink" onClick={save} data-testid="stage-save">שמירת השלב</button>
    </div>
  )
}

function DeliverableEditor({ d, n }) {
  const { reloadCourse } = useApp()
  const notify = useNotice()
  const [title, setTitle] = useState(d.title)
  const [description, setDescription] = useState(d.description)
  async function save() {
    try {
      await rpc('cgh_save_deliverable', { p_id: d.id, p_stage: d.stage_id, p_title: title, p_description: description, p_sort: d.sort_order })
      await reloadCourse(); notify('התוצר נשמר.')
    } catch { notify('שמירת התוצר נכשלה.') }
  }
  return (
    <div className="inline-edit deliv-edit">
      <span className="mono">{stageNumber(n)}</span>
      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="שם התוצר" />
      <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} aria-label="תיאור התוצר" />
      <button className="btn" onClick={save} data-testid={`deliv-save-${n}`}>שמירה</button>
    </div>
  )
}

function AddDeliverable({ stageId, order }) {
  const { reloadCourse } = useApp()
  const notify = useNotice()
  const [title, setTitle] = useState('')
  async function add() {
    if (!title.trim()) return
    try {
      await rpc('cgh_save_deliverable', { p_id: null, p_stage: stageId, p_title: title.trim(), p_description: '', p_sort: order })
      setTitle(''); await reloadCourse()
    } catch { notify('הוספת התוצר נכשלה.') }
  }
  return (
    <li className="deliv add">
      <div className="inline-edit deliv-edit">
        <span className="mono">חדש</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="שם התוצר החדש" aria-label="שם התוצר החדש" data-testid="new-deliv" />
        <button className="btn ink" onClick={add} data-testid="add-deliv">הוספת תוצר</button>
      </div>
    </li>
  )
}
