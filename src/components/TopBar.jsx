import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { supabase, DEV_CHAT_URL } from '../supabase.js'
import { useSignIn } from './SignIn.jsx'

export default function TopBar() {
  const { session, me } = useApp()
  const location = useLocation()
  const [copied, setCopied] = useState(false)
  const [installEvt, setInstallEvt] = useState(null)
  const [open, setOpen] = useState(false)
  const signIn = useSignIn()

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

  async function copyLink() {
    const url = window.location.href
    try { await navigator.clipboard.writeText(url) } catch {
      const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select()
      document.execCommand('copy'); t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function install() {
    if (!installEvt) return
    installEvt.prompt()
    await installEvt.userChoice.catch(() => {})
    setInstallEvt(null)
  }

  const isMentor = me?.role === 'mentor'
  const links = !session ? [] : isMentor
    ? [['/', 'סקירה'], ['/mentor', 'תור בדיקה'], ['/mentor/group', 'הקבוצה']]
    : [['/', 'המסלול שלי'], ['/anchor', 'ארגון עוגן']]

  const actions = (
    <>
      <button className="btn ghost" onClick={copyLink} data-testid="copy-link">
        {copied ? 'הקישור הועתק' : 'העתקת קישור'}
      </button>
      <a className="btn ghost" href={DEV_CHAT_URL} target="_blank" rel="noreferrer" data-testid="dev-chat">שיחת הפיתוח</a>
      {installEvt && <button className="btn accent" onClick={install} data-testid="install">התקנת האפליקציה</button>}
      {session
        ? <button className="btn line" onClick={() => supabase.auth.signOut()} data-testid="sign-out">יציאה</button>
        : <button className="btn solid" onClick={signIn} data-testid="sign-in">כניסה עם Google</button>}
    </>
  )

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="הכשרה לבניית אפליקציות, לדף הבית">
          <img src="/icons/icon.svg" alt="" width="30" height="30" />
          <span className="brand-name">הכשרה לבניית אפליקציות</span>
        </Link>
        {links.length > 0 && (
          <nav className="navlinks" aria-label="ניווט ראשי">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => 'navlink' + (isActive ? ' on' : '')}>{label}</NavLink>
            ))}
          </nav>
        )}
        <div className="actions">{actions}</div>
        <button className="btn ghost menu-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="menu">
          {open ? 'סגירה' : 'תפריט'}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="drawer" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="drawer-inner">
              {links.map(([to, label]) => (
                <NavLink key={to} to={to} end className={({ isActive }) => 'navlink' + (isActive ? ' on' : '')}>{label}</NavLink>
              ))}
              <div className="drawer-actions">{actions}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
