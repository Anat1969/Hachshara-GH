import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp, stageComplete } from '../store.jsx'
import StageMap from '../components/StageMap.jsx'
import { Badge, Loading } from '../components/States.jsx'
import { dueDate, fmtDate, daysLeft, stageNumber, SECTOR_LABEL } from '../lib.js'

export default function ParticipantHome() {
  const { course, data, me } = useApp()
  if (!course) return <Loading />
  const { enrollment, submissions, anchor } = data
  const cur = enrollment.current_stage
  const stage = course.stages.find((s) => s.id === cur)
  const ds = course.deliverables.filter((d) => d.stage_id === cur)
  const subOf = (d) => submissions.find((s) => s.deliverable_id === d.id)
  const due = dueDate(enrollment.cohort?.starts_on, stage?.due_week ?? 1)
  const left = daysLeft(due)
  const complete = stageComplete(cur, course.deliverables, submissions, anchor)

  const items = [
    ...(cur === 0 ? [{ key: 'anchor', title: 'בחירת ארגון עוגן', status: anchor?.status || 'none', to: '/anchor' }] : []),
    ...ds.map((d) => ({ key: d.id, title: d.title, status: subOf(d)?.status || 'none', to: `/stage/${cur}?d=${d.id}` })),
  ]
  const next = items.find((i) => ['none', 'draft', 'returned'].includes(i.status))
  const name = me?.profile?.display_name || ''

  return (
    <div className="home">
      <section className="hello">
        <span className="eyebrow">{enrollment.cohort?.name}</span>
        <h1>שלום{name ? `, ${name}` : ''}</h1>
        {anchor?.status === 'approved' && (
          <p className="lead">הארגון שלך: <strong>{anchor.org_name}</strong> <span className="mono muted">{SECTOR_LABEL[anchor.sector]}</span></p>
        )}
      </section>

      <div className="home-grid">
        <motion.article className="card current" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-layer" aria-hidden="true" />
          <span className="mono big-num">{stageNumber(cur)}</span>
          <span className="eyebrow">השלב הנוכחי · {stage?.weeks}</span>
          <h2>{stage?.title}</h2>
          <p>{stage?.goal}</p>
          <Link className="btn solid" to={`/stage/${cur}`} data-testid="open-current">לדרישות השלב</Link>
        </motion.article>

        <motion.article className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <span className="eyebrow">התוצר הבא</span>
          {complete ? (
            <>
              <h3>כל התוצרים בשלב אושרו</h3>
              <p>המנטור יעביר אותך לשלב הבא.</p>
            </>
          ) : next ? (
            <>
              <h3>{next.title}</h3>
              <Badge status={next.status} />
              <Link className="btn line" to={next.to} data-testid="open-next">לעבודה על התוצר</Link>
            </>
          ) : (
            <>
              <h3>הכול הוגש</h3>
              <p>התוצרים ממתינים לבדיקת המנטור.</p>
            </>
          )}
        </motion.article>

        <motion.article className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <span className="eyebrow">תאריך יעד</span>
          <h3 className="date">{fmtDate(due)}</h3>
          {left !== null && (
            <p className={`mono ${left < 0 ? 'late' : ''}`}>
              {left > 1 ? `עוד ${left} ימים` : left === 1 ? 'מחר' : left === 0 ? 'היום' : `באיחור של ${-left} ימים`}
            </p>
          )}
        </motion.article>
      </div>

      <section className="section">
        <header className="section-head">
          <span className="eyebrow">תוצרי השלב</span>
          <h2>מה צריך להגיש עכשיו</h2>
        </header>
        <ul className="rows">
          {items.map((i) => (
            <li key={i.key}>
              <Link className="row" to={i.to}>
                <span>{i.title}</span>
                <Badge status={i.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <header className="section-head">
          <span className="eyebrow">המסלול המלא</span>
          <h2>איפה את או אתה במסלול</h2>
        </header>
        <StageMap
          stages={course.stages}
          deliverables={course.deliverables}
          state={(s) => (s.id < cur ? 'done' : s.id === cur ? 'current' : 'next')}
        />
      </section>
    </div>
  )
}
