import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

/**
 * Anat's signature mark: the word "ענת" drawn as a line, filled with a moving
 * light gradient, sitting on three stacked planes that tilt toward the pointer.
 * The gradient phase follows the hour of the day, so the mark is never the same twice.
 */
export default function AnatLogo({ size = 34 }) {
  const [hourPhase] = useState(() => (new Date().getHours() / 24) * 360)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotX = useSpring(useTransform(my, [-1, 1], [14, -14]), { stiffness: 140, damping: 14 })
  const rotY = useSpring(useTransform(mx, [-1, 1], [-18, 18]), { stiffness: 140, damping: 14 })
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduce) return
    const onMove = (e) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1)
      my.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my, reduce])

  return (
    <motion.span
      aria-label="ענת" role="img" className="anat-logo"
      style={{ width: size * 1.9, height: size, rotateX: rotX, rotateY: rotY }}
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i} aria-hidden="true" className="anat-plane"
          style={{
            borderColor: `hsl(0 0% ${70 - i * 18}% / ${0.55 - i * 0.15})`,
            background: `linear-gradient(${135 + i * 20}deg, hsl(0 0% ${22 - i * 5}% / 0.9), hsl(0 0% ${8 - i * 2}% / 0.6))`,
            transform: `translateZ(${-i * 10}px) translate(${i * 3}px, ${i * 3}px)`,
            boxShadow: i === 0 ? '0 8px 24px -8px hsl(0 0% 0% / 0.8), inset 0 1px 0 hsl(0 0% 100% / 0.12)' : 'none',
          }}
          animate={reduce ? undefined : { x: [0, i * 1.5, 0], y: [0, -i * 1.5, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <svg viewBox="0 0 190 100" className="anat-svg">
        <defs>
          <linearGradient id="anat-sheen" x1="0" y1="0" x2="1" y2="1" gradientTransform={`rotate(${hourPhase} .5 .5)`}>
            <stop offset="0%" stopColor="#f5f5f4" />
            <stop offset="45%" stopColor="#a8a29e" />
            <stop offset="100%" stopColor="#fafaf9" />
            {!reduce && (
              <animateTransform attributeName="gradientTransform" type="rotate" from={`${hourPhase} .5 .5`} to={`${hourPhase + 360} .5 .5`} dur="14s" repeatCount="indefinite" />
            )}
          </linearGradient>
        </defs>
        <motion.text
          x="95" y="70" textAnchor="middle" fontFamily="'IBM Plex Sans Hebrew', sans-serif" fontWeight={200} fontSize="64"
          fill="url(#anat-sheen)" stroke="#e7e5e4" strokeWidth={0.8} strokeDasharray="420"
          initial={{ strokeDashoffset: 420, fillOpacity: 0 }} animate={{ strokeDashoffset: 0, fillOpacity: 1 }}
          transition={{ strokeDashoffset: { duration: 1.6, ease: 'easeInOut' }, fillOpacity: { delay: 1.1, duration: 0.9 } }}
        >
          ענת
        </motion.text>
      </svg>
    </motion.span>
  )
}
