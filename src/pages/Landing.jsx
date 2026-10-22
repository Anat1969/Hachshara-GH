import { motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import StageMap from '../components/StageMap.jsx'
import Entry from '../components/Entry.jsx'
import { Tower, WeekTimeline } from '../components/viz.jsx'
import { Loading, ErrorState } from '../components/States.jsx'

export default function Landing() {
  const { course, courseError, reloadCourse } = useApp()

  return (
    <div className="landing">
      <section className="hero hero-split">
        <div className="hero-text">
          <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>מסלול של 12 שבועות</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            ארגון אמיתי.<br />תהליך אחד.<br /><span className="ink">פתרון אחד שעובד.</span>
          </motion.h1>
          <motion.p className="lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            הכשרה לבניית פתרונות AI לארגוני תרבות ועירייה. בונים קומה אחרי קומה: מתחילים מהתהליך ולא מהכלי,
            עוברים שמונה שלבים עם מנטור, ומסיימים בפתרון שהארגון באמת משתמש בו.
          </motion.p>
          <Entry />
        </div>
        <div className="hero-viz">
          {course ? <Tower stages={course.stages} /> : <div className="sk sk-card tall" />}
        </div>
      </section>

      <section className="section">
        <header className="section-head">
          <span className="eyebrow">לוח הזמנים</span>
          <h2>12 שבועות, שמונה שלבים</h2>
        </header>
        {course && <WeekTimeline stages={course.stages} startsOn={course.cohort?.starts_on} />}
      </section>

      <section id="map" className="section">
        <header className="section-head">
          <span className="eyebrow">מפת המסלול</span>
          <h2>מארגון עוגן ועד הטמעה</h2>
        </header>
        {courseError ? <ErrorState onRetry={reloadCourse} /> : !course ? <Loading /> :
          <StageMap stages={course.stages} deliverables={course.deliverables} />}
      </section>
    </div>
  )
}
