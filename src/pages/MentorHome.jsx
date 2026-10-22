import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { buildQueue, buildRows } from '../mentor.js'
import StageMap from '../components/StageMap.jsx'
import { Loading } from '../components/States.jsx'

export default function MentorHome() {
  const { course, data, me } = useApp()
  if (!course) return <Loading />
  const rows = buildRows(course, data)
  const queue = buildQueue(course, data)
  const ready = rows.filter((r) => r.ready).length
  const cohort = data.cohorts[0]
  const stats = [
    ['משתתפים', rows.length, '/mentor/group'],
    ['ממתינים לבדיקה', queue.length, '/mentor'],
    ['מוכנים למעבר שלב', ready, '/mentor/group?status=ready'],
  ]
  return (
    <div className="home">
      <section className="hello">
        <span className="eyebrow">מנטור · {cohort?.name || 'ללא מחזור פתוח'}</span>
        <h1>שלום{me?.profile?.display_name ? `, ${me.profile.display_name}` : ''}</h1>
        <p className="lead">{queue.length ? `${queue.length} תוצרים מחכים להחלטה שלך.` : 'אין כרגע תוצרים שמחכים לבדיקה.'}</p>
      </section>
      <div className="stats">
        {stats.map(([label, n, to], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Link className="stat" to={to} data-testid={`stat-${i}`}>
              <span className="stat-n">{n}</span>
              <span className="eyebrow">{label}</span>
            </Link>
          </motion.div>
        ))}
      </div>
      <section className="section">
        <header className="section-head">
          <span className="eyebrow">תוכן המסלול</span>
          <h2>השלבים. לחיצה על שלב פותחת אותו לעריכה</h2>
        </header>
        <StageMap stages={course.stages} deliverables={course.deliverables}
          state={(s) => (rows.some((r) => r.e.current_stage === s.id) ? 'current' : undefined)} />
      </section>
    </div>
  )
}
