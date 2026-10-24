import { useMemo, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp, personalLink } from '../store.jsx'
import { DEV_CHAT_URL, RESEARCH_URL } from '../supabase.js'
import AIMenu from './AIMenu.jsx'

async function copy(text) {
  try { await navigator.clipboard.writeText(text) } catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select()
    document.execCommand('copy'); t.remove()
  }
}

export default function TopBar() {
  const { identity, setIdentity } = useApp()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')

  const isMentor = identity?.role === 'mentor'
  const links = !identity ? [['/', 'המסלול'], ['/example', 'דוגמאות מקצה לקצה']] : isMentor
    ? [['/', 'סקירה'], ['/mentor', 'תור בדיקה'], ['/mentor/group', 'הקבוצה'], ['/example', 'דוגמאות']]
    : [['/', 'המסלול שלי'], ['/anchor', 'ארגון עוגן'], ['/example', 'דוגמאות']]

  const items = useMemo(() => [
    identity?.role === 'participant' && {
      label: 'הקישור האישי שלי',
      hint: 'העתקה',
      onSelect: async () => { await copy(personalLink(identity.key)); setStatus('הקישור האישי הועתק'); setTimeout(() => setStatus(''), 1800) },
    },
    identity && { label: 'החלפת משתמש', hint: isMentor ? 'מנטור' : 'משתתף', onSelect: () => { setIdentity(null); navigate('/') } },
  ].filter(Boolean), [identity, isMentor, setIdentity, navigate])

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="הכשרה לבניית אפליקציות, לדף הבית">
          <img src="/icons/icon.svg" alt="" width="30" height="30" />
          <span className="brand-name">הכשרה לבניית אפליקציות</span>
        </Link>
        <nav className="navlinks" aria-label="ניווט ראשי">
          {links.map(([to, label], i) => (
            <NavLink key={to} to={to} end className={({ isActive }) => 'navlink' + (isActive ? ' on' : '')}>
              {({ isActive }) => (
                <>
                  <span className="arch-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span>{label}</span>
                  {isActive && <motion.span layoutId="nav-rule" className="nav-rule" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="owner">
          <AIMenu chat={DEV_CHAT_URL} research={RESEARCH_URL} items={items} status={status} />
        </div>
      </div>
    </header>
  )
}
