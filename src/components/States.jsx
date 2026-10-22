import { motion } from 'framer-motion'

export function Loading() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="טוען">
      <div className="sk sk-title" />
      <div className="sk sk-line" />
      <div className="sk-grid">
        {[0, 1, 2].map((i) => <div key={i} className="sk sk-card" style={{ animationDelay: `${i * 120}ms` }} />)}
      </div>
    </div>
  )
}

export function ErrorState({ onRetry, text }) {
  return (
    <motion.section className="state" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} role="alert">
      <span className="eyebrow">שגיאה</span>
      <h2>משהו לא נטען</h2>
      <p>{text || 'לא הצלחנו להביא את המידע מהשרת. בדקו את החיבור ונסו שוב.'}</p>
      <button className="btn ink" onClick={onRetry} data-testid="retry">נסה שוב</button>
    </motion.section>
  )
}

export function NoAccess({ text }) {
  return (
    <motion.section className="state" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <span className="eyebrow">אין הרשאה</span>
      <h2>אין גישה לדף הזה</h2>
      <p>{text}</p>
    </motion.section>
  )
}

export function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{text}</p>
      {children}
    </div>
  )
}

export function Badge({ status }) {
  const label = { none: 'לא התחיל', draft: 'טיוטה', submitted: 'ממתין לבדיקה', approved: 'אושר', returned: 'לתיקון' }[status] || status
  return <span className={`badge b-${status}`}>{label}</span>
}
