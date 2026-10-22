import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { buildRows } from '../mentor.js'
import { Loading, Empty, Badge } from '../components/States.jsx'
import AdvanceButton from '../components/AdvanceButton.jsx'
import { StageTrack } from '../components/viz.jsx'
import { stageNumber } from '../lib.js'

const FILTERS = [
  ['all', 'הכל'],
  ['pending', 'ממתינים לבדיקה'],
  ['returned', 'הוחזרו לתיקון'],
  ['ready', 'מוכנים למעבר שלב'],
]

export default function MentorGroup() {
  const { course, data } = useApp()
  const [params, setParams] = useSearchParams()
  if (!course) return <Loading />
  const filter = params.get('status') || 'all'
  const rows = buildRows(course, data)
  const shown = rows.filter((r) =>
    filter === 'pending' ? r.pending > 0 : filter === 'returned' ? r.returned > 0 : filter === 'ready' ? r.ready : true)
  const stageTitle = (id) => course.stages.find((s) => s.id === id)?.title

  return (
    <div className="group">
      <section className="hello">
        <span className="eyebrow">הקבוצה</span>
        <h1>{rows.length} משתתפים</h1>
      </section>
      <div className="segmented filters" role="tablist" aria-label="סינון לפי סטטוס">
        {FILTERS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''}
            onClick={() => setParams(k === 'all' ? {} : { status: k }, { replace: true })} data-testid={`filter-${k}`}>
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty title="אין משתתפים בסינון הזה" text={rows.length ? 'אפשר לבחור סינון אחר.' : 'משתתפים מצטרפים אוטומטית כשהם נכנסים למערכת בפעם הראשונה.'} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>משתתף</th><th>שלב</th><th>ארגון עוגן</th><th>הוגשו</th><th>ממתינים</th><th>פעולה</th></tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <motion.tr key={r.e.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <td data-label="משתתף"><strong>{r.name}</strong></td>
                  <td data-label="שלב"><StageTrack current={r.e.current_stage} /><span className="mono">{stageNumber(r.e.current_stage)}</span> {stageTitle(r.e.current_stage)}</td>
                  <td data-label="ארגון עוגן">{r.anchor ? <>{r.anchor.org_name} <Badge status={r.anchor.status} /></> : <Badge status="none" />}</td>
                  <td data-label="הוגשו" className="mono">{r.handedIn}</td>
                  <td data-label="ממתינים" className="mono">{r.pending}</td>
                  <td data-label="פעולה"><AdvanceButton enrollmentId={r.e.id} />{!r.ready && <span className="muted small">{r.returned ? `${r.returned} לתיקון` : ''}</span>}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
