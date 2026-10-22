import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { buildQueue, buildRows } from '../mentor.js'
import { Tower, StageColumns, StatusBar } from '../components/viz.jsx'
import { Loading } from '../components/States.jsx'

export default function MentorHome() {
  const { course, data, identity } = useApp()
  if (!course) return <Loading />
  const rows = buildRows(course, data)
  const queue = buildQueue(course, data)
  const ready = rows.filter((r) => r.ready).length
  const perStage = {}
  for (const r of rows) perStage[r.e.current_stage] = (perStage[r.e.current_stage] || 0) + 1
  const counts = {}
  for (const s of data.submissions) counts[s.status] = (counts[s.status] || 0) + 1
  for (const a of data.anchors) counts[a.status] = (counts[a.status] || 0) + 1
  const stats = [
    ['משתתפים', rows.length, '/mentor/group'],
    ['ממתינים לבדיקה', queue.length, '/mentor'],
    ['מוכנים למעבר שלב', ready, '/mentor/group?status=ready'],
  ]
  return (
    <div className="home">
      <section className="hello hello-split">
        <div>
          <span className="eyebrow">מנטור · {course.cohort?.name || 'ללא מחזור פתוח'}</span>
          <h1>שלום{identity?.name && identity.name !== 'מנטור' ? `, ${identity.name}` : ''}</h1>
          <p className="lead">{queue.length ? `${queue.length} תוצרים מחכים להחלטה שלך.` : 'אין כרגע תוצרים שמחכים לבדיקה.'}</p>
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
        </div>
        <Tower stages={course.stages} compact />
      </section>

      <div className="viz-grid">
        <section className="card">
          <span className="eyebrow">פיזור הקבוצה</span>
          <h3>כמה משתתפים בכל שלב</h3>
          <StageColumns stages={course.stages} counts={perStage} />
        </section>
        <section className="card">
          <span className="eyebrow">מצב ההגשות</span>
          <h3>כל התוצרים בקבוצה</h3>
          <StatusBar counts={counts} />
        </section>
      </div>

    </div>
  )
}
