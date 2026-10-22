import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'

/**
 * Anat's mark, as she signs it: "A & I | אד׳ ענת שטיבלמן".
 * On load the name is written from right to left behind a moving pen line, the divider rises,
 * A and I slide apart and the ampersand turns into place between them. At rest a light sweeps the name, the mark tilts toward
 * the pointer, and the ampersand turns a quarter when the panel under it is open.
 */
export default function AnatLogo({ open = false }) {
  const reduce = useReducedMotion()
  const [entered, setEntered] = useState(false)
  useEffect(() => { const id = setTimeout(() => setEntered(true), 1800); return () => clearTimeout(id) }, [])
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotX = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 140, damping: 16 })
  const rotY = useSpring(useTransform(mx, [-1, 1], [-12, 12]), { stiffness: 140, damping: 16 })

  useEffect(() => {
    if (reduce) return
    const onMove = (e) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1)
      my.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my, reduce])

  const t = (delay, duration = 0.6) => (reduce ? { duration: 0 } : { delay, duration, ease: [0.2, 0.7, 0.2, 1] })

  return (
    <motion.span className={`anat-mark ${open ? 'open' : ''}`} role="img" aria-label="A & I, אד׳ ענת שטיבלמן"
      style={{ rotateX: rotX, rotateY: rotY }}>
      <motion.span className="am-title" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={t(0.1, 0.5)}>
        אד׳
      </motion.span>
      <span className="am-name-wrap">
        <motion.span className="am-name"
          initial={{ clipPath: 'inset(0 0 0 100%)' }} animate={{ clipPath: 'inset(0 0 0 0%)' }} transition={t(0.3, 1.1)}>
          ענת שטיבלמן
        </motion.span>
        {!reduce && (
          <motion.span className="am-pen" aria-hidden="true"
            initial={{ right: '0%', opacity: 1 }} animate={{ right: '100%', opacity: [1, 1, 0] }}
            transition={{ delay: 0.3, duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }} />
        )}
      </span>
      <motion.span className="am-bar" aria-hidden="true" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={t(1.25, 0.45)} />
      <span className="am-ai" dir="ltr">
        <motion.span className="am-letter" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={t(1.35, 0.5)}>A</motion.span>
        <motion.span className="am-amp"
          initial={{ rotate: -200, scale: 0.2, opacity: 0 }}
          animate={{ rotate: open ? 90 : 0, scale: 1, opacity: 1 }}
          whileHover={reduce ? undefined : { rotate: open ? 100 : 14, scale: 1.15 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 14, delay: entered ? 0 : 1.45 }}>
          &amp;
        </motion.span>
        <motion.span className="am-letter" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={t(1.35, 0.5)}>I</motion.span>
      </span>
    </motion.span>
  )
}
