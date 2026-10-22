import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { googleEnabled } from '../supabase.js'
import { useSignIn } from '../components/SignIn.jsx'
import StageMap from '../components/StageMap.jsx'
import { Loading, ErrorState } from '../components/States.jsx'

export default function Landing() {
  const { course, courseError, reloadCourse } = useApp()
  const signIn = useSignIn()
  const [google, setGoogle] = useState(null)

  useEffect(() => { googleEnabled().then(setGoogle).catch(() => setGoogle(null)) }, [])

  return (
    <div className="landing">
      <section className="hero">
        <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>מסלול של 12 שבועות</motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          ארגון אמיתי.<br />תהליך אחד.<br /><span className="ink">פתרון אחד שעובד.</span>
        </motion.h1>
        <motion.p className="lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          הכשרה לבניית פתרונות AI לארגוני תרבות ועירייה. מתחילים מהתהליך ולא מהכלי, עוברים שמונה שלבים עם מנטור,
          ומסיימים בפתרון שהארגון באמת משתמש בו.
        </motion.p>
        <motion.div className="hero-cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}>
          <button className="btn solid lg" onClick={signIn} data-testid="hero-sign-in">כניסה עם Google</button>
          <a className="btn line lg" href="#map">לשלבי המסלול</a>
        </motion.div>
        {google === false && (
          <p className="notice-strip" data-testid="google-off">
            הכניסה עם Google עדיין לא הופעלה. אפשר לעיין במסלול, והכניסה תיפתח בקרוב.
          </p>
        )}
        <div className="principles">
          {[
            ['01', 'קודם תהליך', 'מפרקים תהליך כואב לצעדים לפני שבוחרים כלי.'],
            ['02', 'פירמידת פתרונות', 'הפתרון הפשוט ביותר שעובד, ורק אז AI.'],
            ['03', 'מנטור בכל שלב', 'כל תוצר נבדק ומאושר לפני מעבר לשלב הבא.'],
          ].map(([n, t, d], i) => (
            <motion.div key={n} className="principle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <span className="mono">{n}</span><strong>{t}</strong><p>{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="map" className="section">
        <header className="section-head">
          <span className="eyebrow">מפת המסלול</span>
          <h2>שמונה שלבים, מארגון עוגן ועד הטמעה</h2>
        </header>
        {courseError ? <ErrorState onRetry={reloadCourse} /> : !course ? <Loading /> :
          <StageMap stages={course.stages} deliverables={course.deliverables} />}
      </section>
    </div>
  )
}
