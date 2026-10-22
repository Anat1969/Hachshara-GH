import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import TopBar from './components/TopBar.jsx'
import { useApp } from './store.jsx'
import { Loading, ErrorState, NoAccess } from './components/States.jsx'
import Landing from './pages/Landing.jsx'
import ParticipantHome from './pages/ParticipantHome.jsx'
import MentorHome from './pages/MentorHome.jsx'
import StagePage from './pages/StagePage.jsx'
import AnchorPage from './pages/AnchorPage.jsx'
import MentorQueue from './pages/MentorQueue.jsx'
import MentorGroup from './pages/MentorGroup.jsx'

function Gate({ role, children }) {
  const { session, status, error, reload, me, data } = useApp()
  if (session === undefined) return <Loading />
  if (!session) return <Landing />
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />
  if (status !== 'ready' || !me) return <Loading />
  if (role === 'mentor' && me.role !== 'mentor') {
    return <NoAccess text="הדף הזה מיועד למנטורים. אם את או אתה מנטור, פנו למנהלת ההכשרה כדי לקבל הרשאה." />
  }
  if (role === 'participant' && me.role === 'participant' && !data?.enrollment) {
    return <NoAccess text="עדיין אין לך שיבוץ למחזור פעיל. פנו למנטור של הקבוצה כדי שיצרף אתכם." />
  }
  return children
}

function Home() {
  const { session, me } = useApp()
  if (session && me?.role === 'mentor') return <Gate><MentorHome /></Gate>
  return <Gate role="participant"><ParticipantHome /></Gate>
}

export default function App() {
  const location = useLocation()
  return (
    <div className="shell">
      <div className="backdrop" aria-hidden="true">
        <div className="plane p1" /><div className="plane p2" /><div className="plane p3" />
      </div>
      <TopBar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="page"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/stage/:id" element={<StagePage />} />
            <Route path="/anchor" element={<Gate role="participant"><AnchorPage /></Gate>} />
            <Route path="/mentor" element={<Gate role="mentor"><MentorQueue /></Gate>} />
            <Route path="/mentor/group" element={<Gate role="mentor"><MentorGroup /></Gate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <footer className="foot">
        <span className="mono">CULTURA-GH</span>
        <span>מסלול הכשרה של 12 שבועות. ארגון אמיתי, תהליך אחד, פתרון אחד.</span>
      </footer>
    </div>
  )
}
