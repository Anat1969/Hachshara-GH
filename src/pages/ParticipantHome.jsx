import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp, stageComplete } from '../store.jsx'
import { Badge, Loading } from '../components/States.jsx'
import { Tower, WeekTimeline, StatusBar, DueRing } from '../components/viz.jsx'
import { dueDate, fmtDate, daysLeft, stageNumber, SECTOR_LABEL } from '../lib.js'

export default function ParticipantHome() {
  const { course, data, identity } = useApp()
  if (!course) return <Loading />
  const { enrollment, submissions, anchor } = data
  const cur = enrollment.current_stage
  const stage = course.stages.find((s) => s.id === cur)
  const ds = course.deliverables.filter((d) => d.stage_id === cur)
  const subOf = (d) => submissions.find((s) => s.deliverable_id === d.id)
  const due = dueDate(enrollment.cohort?.starts_on, stage?.due_week ?? 1)
  const left = daysLeft(due)
  const prevDue = cur === 0 ? 0 : course.stages.find((s) => s.id === cur - 1)?.due_week ?? 0
  const span = ((stage?.due_week ?? 1) - prevDue) * 7
  const complete = stageComplete(cur, course.deliverables, submissions, anchor)

  const items = [
    ...(cur === 0 ? [{ key: 'anchor', title: 'בחירת ארגון עוגן', status: anchor?.status || 'none', to: '/anchor' }] : []),
    ...ds.map((d) => ({ key: d.id, title: d.title, status: subOf(d)?.status || 'none', to: `/stage/${cur}?d=${d.id}` })),
  ]
  const next = items.find((i) => ['none', 'draft', 'returned'].includes(i.status))

  // All deliverables opened so far, by status
  const opened = course.deliverables.filter((d) => d.stage_id <= cur)
  const counts = {}
  for (const d of opened) { const k = subOf(d)?.status || 'none'; counts[k] = (counts[k] || 0) + 1 }
  const ak = anchor?.status || 'none'; counts[ak] = (counts[ak] || 0) + 1

  return (
    <div className="home">
      <section className="hello hello-split">
        <div>
          <span className="eyebrow">{enrollment.cohort?.name}</span>
          <h1>שלום{identity?.name ? `, ${identity.name}` : ''}</h1>
          {anchor?.status === 'approved'
            ? <p className="lead">הארגון שלך: <strong>{anchor.org_name}</strong> <span className="mono muted">{SECTOR_LABEL[anchor.sector]}</span></p>
            : <p className="lead">את או אתה בקומה {stageNumber(cur)} מתוך 07. כל קומה נבנית על הקודמת.</p>}
          <StatusBar counts={counts} label="התוצרים שנפתחו עד עכשיו" />
        </div>
        <Tower stages={course.stages} current={cur} compact />
      </section>

      <div className="home-grid">
        <motion.article className="card current" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-layer" aria-hidden="true" />
          <span className="mono big-num" aria-hidden="true">{stageNumber(cur)}</span>
          <span className="eyebrow">השלב הנוכחי · {stage?.weeks}</span>
          <h2>{stage?.title}</h2>
          <p>{stage?.goal}</p>
          <Link className="btn ink" to={`/stage/${cur}`} data-testid="open-current">לדרישות השלב</Link>
        </motion.article>

        <motion.article className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <span className="eyebrow">התוצר הבא</span>
          {complete ? (
            <><h3>כל התוצרים בשלב אושרו</h3><p>המנטור יעביר אותך לשלב הבא.</p></>
          ) : next ? (
            <>
              <h3>{next.title}</h3>
              <Badge status={next.status} />
              <Link className="btn" to={next.to} data-testid="open-next">לעבודה על התוצר</Link>
            </>
          ) : (
            <><h3>הכול הוגש</h3><p>התוצרים ממתינים לבדיקת המנטור.</p></>
          )}
        </motion.article>

        <motion.article className="card due" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <span className="eyebrow">תאריך יעד</span>
          <DueRing daysLeft={left} spanDays={span} />
          <h3 className="date">{fmtDate(due)}</h3>
        </motion.article>
      </div>

      <section className="section">
        <header className="section-head">
          <span className="eyebrow">תוצרי השלב</span>
          <h2>מה צריך להגיש עכשיו</h2>
        </header>
        <ol className="rows flow">
          {items.map((i, n) => (
            <motion.li key={i.key} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * n }}>
              <Link className={`row st-${i.status}`} to={i.to}>
                <span className="mono">{stageNumber(n + 1)}</span>
                <span className="row-title">{i.title}</span>
                <Badge status={i.status} />
              </Link>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="section">
        <header className="section-head">
          <span className="eyebrow">לוח הזמנים</span>
          <h2>איפה את או אתה ב-12 השבועות</h2>
        </header>
        <WeekTimeline stages={course.stages} startsOn={enrollment.cohort?.starts_on} current={cur} />
      </section>
    </div>
  )
}
