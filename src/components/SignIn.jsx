import { createContext, useCallback, useContext, useState } from 'react'
import { supabase, googleEnabled } from '../supabase.js'

// Starts Google sign-in, or explains clearly that it is not available.
export function useSignIn() {
  const setNotice = useContext(NoticeCtx)
  return useCallback(async () => {
    let enabled = true
    try { enabled = await googleEnabled() } catch { enabled = true }
    if (!enabled) {
      setNotice('הכניסה עם Google עדיין לא הופעלה במערכת. פנו למנהלת ההכשרה, והכניסה תיפתח תוך זמן קצר.')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname + window.location.search },
    })
    if (error) setNotice('הכניסה נכשלה. נסו שוב בעוד רגע.')
  }, [setNotice])
}

const NoticeCtx = createContext(() => {})

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null)
  return (
    <NoticeCtx.Provider value={setNotice}>
      {children}
      {notice && (
        <div className="toast" role="alert" data-testid="notice">
          <p>{notice}</p>
          <button className="btn line" onClick={() => setNotice(null)}>הבנתי</button>
        </div>
      )}
    </NoticeCtx.Provider>
  )
}

export const useNotice = () => useContext(NoticeCtx)
