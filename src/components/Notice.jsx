import { createContext, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const NoticeCtx = createContext(() => {})

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null)
  return (
    <NoticeCtx.Provider value={setNotice}>
      {children}
      <AnimatePresence>
        {notice && (
          <motion.div className="toast" role="alert" data-testid="notice"
            initial={{ opacity: 0, y: -14, rotateX: -20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -10 }}>
            <p>{notice}</p>
            <button className="btn" onClick={() => setNotice(null)}>הבנתי</button>
          </motion.div>
        )}
      </AnimatePresence>
    </NoticeCtx.Provider>
  )
}

export const useNotice = () => useContext(NoticeCtx)
