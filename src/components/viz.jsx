import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { stageNumber, STATUS_LABEL } from '../lib.js'

const EASE = [0.2, 0.7, 0.2, 1]

/* ---------- The track as a building: eight floors stacked in isometric ---------- */
export function Tower({ stages, current = null, compact = false, onPick = null, caption = null }) {
  const navigate = useNavigate()
  const pick = (id) => (onPick ? onPick(id) : navigate(`/stage/${id}`))
  const [hover, setHover] = useState(null)
  const W = 124, D = 22, T = 14, GAP = 46, CX = 170
  const H = stages.length * (T + GAP) + D * 2 + 30
  const base = H - D - 18
  return (
    <figure className={`tower ${compact ? 'compact' : ''}`}>
      <svg viewBox={`0 0 340 ${H}`} role="img" aria-label="שמונה שלבי המסלול כקומות של בניין">
        <defs>
          <linearGradient id="slab-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#dcdad5" /></linearGradient>
          <linearGradient id="slab-done" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a4e55" /><stop offset="1" stopColor="#1d1f22" /></linearGradient>
          <linearGradient id="slab-cur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e2b85a" /><stop offset="1" stopColor="#9c7629" /></linearGradient>
          <radialGradient id="tower-shadow"><stop offset="0" stopColor="rgba(0,0,0,0.28)" /><stop offset="1" stopColor="rgba(0,0,0,0)" /></radialGradient>
        </defs>
        <ellipse cx={CX} cy={base + D + 10} rx={W * 1.35} ry={D * 0.9} fill="url(#tower-shadow)" />
        {stages.map((s, i) => {
          const y = base - i * (T + GAP)
          const state = current == null ? 'idle' : s.id < current ? 'done' : s.id === current ? 'cur' : 'next'
          const top = state === 'done' ? 'url(#slab-done)' : state === 'cur' ? 'url(#slab-cur)' : 'url(#slab-top)'
          const side1 = state === 'done' ? '#2a2c30' : state === 'cur' ? '#8a6a1f' : '#c9c6bf'
          const side2 = state === 'done' ? '#15161a' : state === 'cur' ? '#6e5418' : '#b3b0a8'
          const on = hover === s.id
          return (
            <motion.g
              key={s.id} className={`slab ${state}`} tabIndex={0} role="link"
              aria-label={`שלב ${s.id}: ${s.title}`}
              initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: on ? -6 : 0 }}
              transition={{ delay: compact ? 0 : 0.15 + i * 0.09, type: 'spring', stiffness: 220, damping: 20 }}
              onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}
              onClick={() => pick(s.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') pick(s.id) }}
              data-testid={`floor-${s.id}`}
            >
              <path d={`M${CX - W} ${y} L${CX} ${y + D} L${CX} ${y + D + T} L${CX - W} ${y + T} Z`} fill={side1} />
              <path d={`M${CX} ${y + D} L${CX + W} ${y} L${CX + W} ${y + T} L${CX} ${y + D + T} Z`} fill={side2} />
              <path d={`M${CX} ${y - D} L${CX + W} ${y} L${CX} ${y + D} L${CX - W} ${y} Z`} fill={top}
                stroke={on ? '#17181a' : 'rgba(23,24,26,0.18)'} strokeWidth={on ? 1.4 : 0.8} />
              <text x={CX} y={y + 5} textAnchor="middle" className="slab-num"
                fill={state === 'done' ? '#e8e6e1' : state === 'cur' ? '#17181a' : '#5f636a'}>{stageNumber(s.id)}</text>
              {state === 'cur' && (
                <motion.path d={`M${CX} ${y - D} L${CX + W} ${y} L${CX} ${y + D} L${CX - W} ${y} Z`} fill="none" stroke="#c79a3c" strokeWidth="2"
                  animate={{ opacity: [0.9, 0.1, 0.9], scale: [1, 1.08, 1] }} style={{ transformOrigin: `${CX}px ${y}px` }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
              )}
            </motion.g>
          )
        })}
      </svg>
      <figcaption className="tower-cap" aria-live="polite">
        {hover != null ? (
          <>
            <span className="mono">שלב {hover} · {stages.find((s) => s.id === hover)?.weeks}</span>
            <strong>{stages.find((s) => s.id === hover)?.title}</strong>
          </>
        ) : (
          <span className="mono muted">{caption ?? (current == null ? 'מעבר עכבר על קומה מציג את השלב. לחיצה פותחת אותו.' : 'הקומה המוזהבת היא השלב שלך.')}</span>
        )}
      </figcaption>
    </figure>
  )
}

/* ---------- 12 weeks on one line, with today ---------- */
export function WeekTimeline({ stages, startsOn, current = null }) {
  const weeks = 12
  const ranges = stages.map((s, i) => {
    const from = i === 0 ? 1 : stages[i - 1].due_week + 1
    return { s, from, to: Math.max(from, s.due_week) }
  })
  let todayWeek = null
  if (startsOn) {
    const d = (Date.now() - new Date(startsOn + 'T00:00:00').getTime()) / 86400000
    todayWeek = d / 7
  }
  const pct = (w) => `${(w / weeks) * 100}%`
  return (
    <figure className="weeks" aria-label="לוח 12 השבועות">
      <div className="weeks-grid" aria-hidden="true">
        {Array.from({ length: weeks }, (_, i) => <span key={i} className="mono">{i + 1}</span>)}
      </div>
      <div className="weeks-lanes">
        {ranges.map(({ s, from, to }, i) => {
          const state = current == null ? '' : s.id < current ? 'done' : s.id === current ? 'cur' : 'next'
          return (
            <div className="lane" key={s.id}>
              <motion.div
                className={`lane-bar ${state}`}
                style={{ insetInlineStart: pct(from - 1), width: pct(to - from + 1) }}
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: EASE }}
                title={`${s.title} · ${s.weeks}`}
              >
                <span className="mono">{stageNumber(s.id)}</span>
                <span className="lane-title">{s.title}</span>
              </motion.div>
            </div>
          )
        })}
        {todayWeek != null && todayWeek >= 0 && todayWeek <= weeks && (
          <motion.div className="today" style={{ insetInlineStart: pct(todayWeek) }}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.9, duration: 0.5 }}>
            <span className="mono">היום</span>
          </motion.div>
        )}
      </div>
    </figure>
  )
}

/* ---------- Solution pyramid: simplest first, AI last ---------- */
const PYRAMID = [
  ['שינוי תהליך', 'לבטל צעד, לאחד טפסים, לקבוע אחראי. בלי טכנולוגיה בכלל.'],
  ['תבנית ומסמך', 'טופס אחיד, רשימת בדיקה, מסמך משותף.'],
  ['אוטומציה', 'חיבור בין כלים קיימים: טופס שמזין טבלה, תזכורת אוטומטית.'],
  ['AI', 'רק כשהשכבות שמתחת לא מספיקות: סיווג, סיכום, מענה בשפה טבעית.'],
]
export function Pyramid() {
  const [pick, setPick] = useState(0)
  return (
    <figure className="pyramid">
      <div className="pyr-stack">
        {[...PYRAMID].reverse().map(([t], ri) => {
          const i = PYRAMID.length - 1 - ri
          return (
            <motion.button
              key={t} className={`pyr-level l${i} ${pick === i ? 'on' : ''}`} onClick={() => setPick(i)} onMouseEnter={() => setPick(i)}
              style={{ width: `${100 - i * 20}%` }}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * (PYRAMID.length - ri), duration: 0.5, ease: EASE }}
              data-testid={`pyr-${i}`}
            >
              <span className="mono">{String(i + 1).padStart(2, '0')}</span> {t}
            </motion.button>
          )
        })}
      </div>
      <motion.figcaption key={pick} className="pyr-cap" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
        <span className="eyebrow">שכבה {pick + 1} מתוך 4</span>
        <strong>{PYRAMID[pick][0]}</strong>
        <p>{PYRAMID[pick][1]}</p>
      </motion.figcaption>
    </figure>
  )
}

/* ---------- Status composition: stacked bar with legend (labels, never color alone) ---------- */
export const STATUS_ORDER = ['approved', 'submitted', 'returned', 'draft', 'none']
export function StatusBar({ counts, label }) {
  const total = STATUS_ORDER.reduce((a, k) => a + (counts[k] || 0), 0)
  const [hover, setHover] = useState(null)
  return (
    <figure className="statusbar">
      {label && <figcaption className="eyebrow">{label}</figcaption>}
      <div className="sb-track" role="img" aria-label={STATUS_ORDER.filter((k) => counts[k]).map((k) => `${STATUS_LABEL[k]} ${counts[k]}`).join(', ')}>
        {total === 0 && <span className="sb-empty" />}
        {STATUS_ORDER.filter((k) => counts[k]).map((k, i) => (
          <motion.span
            key={k} className={`sb-seg s-${k} ${hover && hover !== k ? 'dim' : ''}`}
            style={{ flexGrow: counts[k] }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: EASE }}
            onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}
          >
            {hover === k && <span className="sb-tip">{STATUS_LABEL[k]}: {counts[k]} מתוך {total}</span>}
          </motion.span>
        ))}
      </div>
      <ul className="legend">
        {STATUS_ORDER.filter((k) => counts[k]).map((k) => (
          <li key={k} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}>
            <i className={`sw s-${k}`} aria-hidden="true" />{STATUS_LABEL[k]} <span className="mono">{counts[k]}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/* ---------- Due date as an arc that empties toward the deadline ---------- */
export function DueRing({ daysLeft, spanDays = 7 }) {
  const r = 46, c = 2 * Math.PI * r
  const frac = daysLeft == null ? 0 : Math.max(0, Math.min(1, daysLeft / spanDays))
  const late = daysLeft != null && daysLeft < 0
  return (
    <svg className={`ring ${late ? 'late' : ''}`} viewBox="0 0 120 120" role="img"
      aria-label={daysLeft == null ? 'אין תאריך יעד' : late ? `באיחור של ${-daysLeft} ימים` : `עוד ${daysLeft} ימים`}>
      <circle cx="60" cy="60" r={r} className="ring-bg" />
      <motion.circle cx="60" cy="60" r={r} className="ring-fg" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - (late ? 1 : frac)) }}
        transition={{ duration: 1.2, ease: EASE }} transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" className="ring-n">{daysLeft == null ? '' : Math.abs(daysLeft)}</text>
      <text x="60" y="78" textAnchor="middle" className="ring-l">{late ? 'ימי איחור' : daysLeft === 1 ? 'יום' : 'ימים'}</text>
    </svg>
  )
}

/* ---------- Participants per stage: one series, one hue ---------- */
export function StageColumns({ stages, counts }) {
  const max = Math.max(1, ...stages.map((s) => counts[s.id] || 0))
  const [hover, setHover] = useState(null)
  return (
    <figure className="columns" aria-label="משתתפים לפי שלב">
      <div className="cols" role="list">
        {stages.map((s, i) => {
          const n = counts[s.id] || 0
          return (
            <div className="col" key={s.id} role="listitem" onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
              aria-label={`${s.title}: ${n} משתתפים`}>
              <div className="col-plot">
                <span className="col-val mono">{n || ''}</span>
                <motion.span className={`col-bar ${hover === s.id ? 'on' : ''}`} style={{ height: `${(n / max) * 100}%` }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.6, ease: EASE }} />
                {hover === s.id && <span className="col-tip">{s.title}: {n} משתתפים</span>}
              </div>
              <span className="col-x mono">{stageNumber(s.id)}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}

/* ---------- Eight cells: where one participant stands ---------- */
export function StageTrack({ current, total = 8 }) {
  return (
    <span className="track" role="img" aria-label={`שלב ${current} מתוך ${total - 1}`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.i key={i} className={i < current ? 'done' : i === current ? 'cur' : ''}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.04 }} />
      ))}
    </span>
  )
}
