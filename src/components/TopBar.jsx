import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp, personalLink } from '../store.jsx'
import { DEV_CHAT_URL, RESEARCH_URL } from '../supabase.js'
import AnatLogo from './AnatLogo.jsx'

async function copy(text) {
  try { await navigator.clipboard.writeText(text) } catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select()
    document.execCommand('copy'); t.remove()
  }
}

export default function TopBar() {
  const { identity, setIdentity } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState('')
  const [installEvt, setInstallEvt] = useState(null)
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e) }
    const onInstalled = () => setInstallEvt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e) => { if (panelRef.current && !panelRef.current.closest('header').contains(e.target)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open])

  async function doCopy(text, label) {
    await copy(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 1800)
  }

  async function install() {
    if (!installEvt) return
    installEvt.prompt()
    await installEvt.userChoice.catch(() => {})
    setInstallEvt(null)
  }

  const isMentor = identity?.role === 'mentor'
  const links = !identity ? [['/', 'המסלול'], ['/example', 'דוגמאות מקצה לקצה']] : isMentor
    ? [['/', 'סקירה'], ['/mentor', 'תור בדיקה'], ['/mentor/group', 'הקבוצה'], ['/example', 'דוגמאות']]
    : [['/', 'המסלול שלי'], ['/anchor', 'ארגון עוגן'], ['/example', 'דוגמאות']]

  const navItems = links.map(([to, label], i) => (
    <NavLink key={to} to={to} end className={({ isActive }) => 'navlink' + (isActive ? ' on' : '')}>
      {({ isActive }) => (
        <>
          <span className="arch-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <span>{label}</span>
          {isActive && <motion.span layoutId="nav-rule" className="nav-rule" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
        </>
      )}
    </NavLink>
  ))

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="הכשרה לבניית אפליקציות, לדף הבית">
          <img src="/icons/icon.svg" alt="" width="30" height="30" />
          <span className="brand-name">הכשרה לבניית אפליקציות</span>
        </Link>
        <nav className="navlinks" aria-label="ניווט ראשי">{navItems}</nav>
        <button
          className={`owner ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)}
          aria-expanded={open} aria-controls="owner-panel" aria-label="אד׳ ענת שטיבלמן: קישורים, שיחת הפיתוח והתקנה" data-testid="menu"
        >
          <AnatLogo open={open} />
          {installEvt && <span className="owner-dot" aria-hidden="true" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            id="owner-panel" ref={panelRef} className="owner-panel"
            initial={{ opacity: 0, y: -12, rotateX: -14 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <nav className="panel-nav" aria-label="ניווט">{navItems}</nav>
            <div className="panel-actions">
              {[
                <button key="copy" className="btn" onClick={() => doCopy(window.location.href, 'page')} data-testid="copy-link">
                  {copied === 'page' ? 'הקישור הועתק' : 'העתקת קישור'}
                </button>,
                identity?.role === 'participant' && (
                  <button key="mine" className="btn" onClick={() => doCopy(personalLink(identity.key), 'mine')} data-testid="copy-personal">
                    {copied === 'mine' ? 'הקישור האישי הועתק' : 'הקישור האישי שלי'}
                  </button>
                ),
                RESEARCH_URL && <a key="research" className="btn" href={RESEARCH_URL} target="_blank" rel="noreferrer" data-testid="research">פרויקט המחקר</a>,
                <a key="chat" className="btn" href={DEV_CHAT_URL} target="_blank" rel="noreferrer" data-testid="dev-chat">שיחת הפיתוח</a>,
                installEvt && <button key="install" className="btn ink" onClick={install} data-testid="install">התקנת האפליקציה</button>,
                identity && (
                  <button key="out" className="btn quiet" onClick={() => { setIdentity(null); navigate('/') }} data-testid="sign-out">
                    החלפת משתמש
                  </button>
                ),
              ].filter(Boolean).map((el, i) => (
                <motion.span key={el.key} className="panel-item" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  {el}
                </motion.span>
              ))}
            </div>
            {identity && (
              <p className="panel-who mono">
                {isMentor ? 'מנטור' : 'משתתף'}{identity.name ? ` · ${identity.name}` : ''}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
