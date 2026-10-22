import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store.jsx'
import { Tower, StageTrack } from '../components/viz.jsx'
import { Badge, Loading } from '../components/States.jsx'
import { EXAMPLE, QUESTIONS, STEPS } from '../data/example.js'
import { stageNumber } from '../lib.js'

const EASE = [0.2, 0.7, 0.2, 1]
const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.55, ease: EASE } }

export default function ExamplePage() {
  const { course } = useApp()
  const [params, setParams] = useSearchParams()
  const initial = Math.min(7, Math.max(0, Number(params.get('s')) || 0))
  const [active, setActive] = useState(initial)
  const refs = useRef([])
  const jumping = useRef(false)

  // Open at the stage named in the link, once the sections exist
  const opened = useRef(false)
  useEffect(() => {
    if (!course || opened.current) return
    opened.current = true
    if (!params.get('s')) return
    jumping.current = true
    requestAnimationFrame(() => {
      refs.current[initial]?.scrollIntoView({ behavior: 'auto', block: 'start' })
      setTimeout(() => { jumping.current = false }, 400)
    })
  }, [course]) // eslint-disable-line react-hooks/exhaustive-deps

  // The building grows with the reading position
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      if (jumping.current) return
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (vis) setActive(Number(vis.target.dataset.stage))
    }, { rootMargin: '-35% 0px -55% 0px' })
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [course])

  useEffect(() => {
    if (String(active) !== params.get('s')) setParams({ s: String(active) }, { replace: true })
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id) => {
    setActive(id)
    jumping.current = true
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { jumping.current = false }, 900)
  }

  if (!course) return <Loading />
  const stageOf = (id) => course.stages.find((s) => s.id === id)

  return (
    <div className="example">
      <section className="ex-hero">
        <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>דוגמה מקצה לקצה · ארגון בדוי להמחשה</motion.span>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>{EXAMPLE.title}</motion.h1>
        <motion.p className="lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          מקרה אחד, משיחה ראשונה ועד מסירה לארגון. בכל קומה: השאלה של השלב, סדר הפעולות, התוצר, תגובת המנטור, ומה עובר הלאה.
        </motion.p>
        <MetricThread />
        <ol className="ex-sequence" aria-label="סדר השאלות">
          {QUESTIONS.map((q, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <button className={`seq ${active === i ? 'on' : ''} ${i < active ? 'past' : ''}`} onClick={() => go(i)} data-testid={`seq-${i}`}>
                <span className="mono">{stageNumber(i)}</span>
                <span>{q}</span>
              </button>
            </motion.li>
          ))}
        </ol>
      </section>

      <div className="ex-mobile-track" aria-hidden="true">
        <StageTrack current={active} />
        <span className="mono">{stageNumber(active)} · {stageOf(active)?.title}</span>
      </div>

      <div className="ex-layout">
        <aside className="ex-aside">
          <Tower stages={course.stages} current={active} compact onPick={go} caption="הבניין גדל בזמן הקריאה. לחיצה על קומה קופצת אליה." />
        </aside>
        <div className="ex-main">
          {STEPS.map((st) => {
            const stage = stageOf(st.id)
            return (
              <section key={st.id} id={`s-${st.id}`} data-stage={st.id} ref={(el) => { refs.current[st.id] = el }} className={`ex-stage ${active === st.id ? 'on' : ''}`}>
                <motion.header className="ex-stage-head" {...reveal}>
                  <span className="mono ex-num" aria-hidden="true">{stageNumber(st.id)}</span>
                  <span className="eyebrow">שלב {st.id} · {stage?.title} · {stage?.weeks}</span>
                  <h2>{QUESTIONS[st.id]}</h2>
                </motion.header>

                <motion.div className="ex-block" {...reveal}>
                  <span className="eyebrow">סדר הפעולות</span>
                  <ol className="ex-actions">
                    {st.actions.map((a, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                        <span className="mono">{i + 1}</span><span>{a}</span>
                      </motion.li>
                    ))}
                  </ol>
                </motion.div>

                <motion.div className="ex-viz" {...reveal}><StageViz st={st} /></motion.div>

                <div className="ex-delivs">
                  {st.deliverables.map((d) => <DeliverableSample key={d.title} d={d} />)}
                </div>

                <motion.div className="ex-review" {...reveal}>
                  <span className="eyebrow">תגובת המנטור</span>
                  {st.review.map((r, i) => (
                    <div key={i} className={`ex-note ${r.decision}`}>
                      <Badge status={r.decision} />
                      <p>{r.note}</p>
                    </div>
                  ))}
                </motion.div>

                <motion.div className="ex-carry" {...reveal}>
                  <span className="eyebrow">{st.id < 7 ? 'עובר לשלב הבא' : 'התוצאה'}</span>
                  <strong>{st.carry}</strong>
                  <Link className="btn quiet" to={`/stage/${st.id}`}>לדרישות שלב {st.id}</Link>
                </motion.div>
              </section>
            )
          })}
          <section className="ex-end">
            <h2>עכשיו המסלול שלך</h2>
            <p className="lead">אותו סדר בדיוק, עם הארגון שלך. מתחילים מהשאלה הראשונה.</p>
            <Link className="btn ink lg" to="/" data-testid="ex-start">חזרה לדף הבית</Link>
          </section>
        </div>
      </div>
    </div>
  )
}

function DeliverableSample({ d }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(d.text) } catch { /* clipboard blocked */ }
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }
  return (
    <motion.article className="ex-deliv" {...reveal}>
      <header>
        <span className="eyebrow">תוצר לדוגמה</span>
        <strong>{d.title}</strong>
      </header>
      <p className="ex-text">{d.text}</p>
      <button className="btn" onClick={copy} data-testid="copy-sample">{copied ? 'הנוסח הועתק' : 'העתקת הנוסח'}</button>
    </motion.article>
  )
}

/* The one number followed through the whole track */
function MetricThread() {
  const { before, target, after, label } = EXAMPLE.metric
  const rows = [['היום, שלב 2', before, 'base'], ['יעד, שלב 2', target, 'target'], ['אחרי הפיילוט, שלב 6', after, 'after']]
  return (
    <figure className="thread">
      <figcaption className="eyebrow">החוט שעובר לאורך כל המסלול: {label}</figcaption>
      {rows.map(([l, v, k], i) => (
        <div className="thread-row" key={k}>
          <span className="thread-l">{l}</span>
          <div className="thread-track">
            <motion.span className={`thread-bar ${k}`} initial={{ width: 0 }} animate={{ width: `${(v / before) * 100}%` }}
              transition={{ delay: 0.4 + i * 0.35, duration: 0.8, ease: EASE }} />
          </div>
          <span className="thread-v mono">{v}</span>
        </div>
      ))}
    </figure>
  )
}

function StageViz({ st }) {
  switch (st.viz) {
    case 'pains': return <PainsViz />
    case 'flow': return <FlowViz flow={st.flow} />
    case 'anatomy': return <AnatomyViz parts={st.anatomy} />
    case 'pyramid': return <OptionsViz options={st.options} chosen={st.chosen} />
    case 'spec': return <SpecViz spec={st.spec} />
    case 'phone': return <PhoneViz screens={st.screens} />
    case 'pilot': return <PilotViz rows={st.pilot} />
    case 'handover': return <HandoverViz items={st.checklist} />
    default: return null
  }
}

function PainsViz() {
  const pains = ['הרשמה לחוגי קיץ בטלפון ובאקסל', 'בקשות לשמירת ספרים בשלושה ערוצים', 'צילומי אירועים בלי חיפוש']
  return (
    <div className="pains-viz">
      <span className="eyebrow">שלושה תהליכים, אחד ייבחר</span>
      {pains.map((p, i) => (
        <motion.div key={i} className={`pv ${i === 0 ? 'chosen' : ''}`} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
          <span className="mono">{String(i + 1).padStart(2, '0')}</span>
          <span>{p}</span>
          {i === 0 && <em className="mono">ייבחר בשלב 1</em>}
        </motion.div>
      ))}
    </div>
  )
}

function FlowViz({ flow }) {
  const total = flow.reduce((a, f) => a + f.m, 0)
  const max = Math.max(...flow.map((f) => f.m))
  return (
    <figure className="flow">
      <figcaption className="eyebrow">מפת התהליך · {total} דקות עבודה להרשמה</figcaption>
      <ol className="flow-steps">
        {flow.map((f, i) => (
          <motion.li key={i} className={f.stuck ? 'stuck' : ''} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
            <strong>{f.t}</strong>
            <span className="flow-bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${(f.m / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }} /></span>
            <span className="mono">{f.m} דק׳</span>
            {f.stuck && <em>{f.stuck}</em>}
          </motion.li>
        ))}
      </ol>
    </figure>
  )
}

function AnatomyViz({ parts }) {
  return (
    <figure className="anatomy">
      <figcaption className="eyebrow">משפט הבעיה בארבעה חלקים</figcaption>
      <div className="anat-parts">
        {parts.map(([k, v], i) => (
          <motion.div key={k} className={`ap ap${i}`} initial={{ opacity: 0, y: 30, rotateX: -30 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.55 }}>
            <span className="mono">{k}</span>
            <p>{v}</p>
          </motion.div>
        ))}
      </div>
    </figure>
  )
}

function OptionsViz({ options, chosen }) {
  const [pick, setPick] = useState(chosen)
  const o = options[pick]
  return (
    <figure className="options">
      <figcaption className="eyebrow">ארבע חלופות, מהפשוטה למורכבת</figcaption>
      <div className="opt-grid">
        <div className="pyr-stack">
          {[...options].reverse().map(([t], ri) => {
            const i = options.length - 1 - ri
            return (
              <button key={t} className={`pyr-level l${i} ${pick === i ? 'on' : ''} ${chosen === i ? 'chosen' : ''}`} style={{ width: `${100 - i * 20}%` }}
                onClick={() => setPick(i)} onMouseEnter={() => setPick(i)} data-testid={`opt-${i}`}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span> {t}
              </button>
            )
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={pick} className="opt-card" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}>
            <span className="eyebrow">{pick === chosen ? 'החלופה שנבחרה' : `חלופה ${pick + 1}`}</span>
            <strong>{o[0]}</strong>
            <p>{o[1]}</p>
            <dl><dt>יתרון</dt><dd>{o[2]}</dd><dt>חיסרון</dt><dd>{o[3]}</dd></dl>
          </motion.div>
        </AnimatePresence>
      </div>
    </figure>
  )
}

function SpecViz({ spec }) {
  return (
    <figure className="spec">
      <figcaption className="eyebrow">האפיון על גיליון אחד</figcaption>
      <div className="spec-grid">
        {spec.map(([k, v], i) => (
          <motion.div key={k} className={`spec-cell ${k === 'לא כלול' ? 'out' : ''}`} initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
            <span className="mono">{k}</span>
            <p>{v}</p>
          </motion.div>
        ))}
      </div>
    </figure>
  )
}

function PhoneViz({ screens }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % screens.length), 2400)
    return () => clearInterval(t)
  }, [screens.length])
  return (
    <figure className="phone-wrap">
      <figcaption className="eyebrow">המסלול המרכזי בשלושה מסכים</figcaption>
      <div className="phone-row">
        <div className="phone" aria-label="הדמיית טלפון">
          <AnimatePresence mode="wait">
            <motion.div key={i} className="phone-screen" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}>
              <span className="mono">{String(i + 1).padStart(2, '0')} / 03</span>
              <strong>{screens[i][0]}</strong>
              {screens[i].slice(1).map((l) => <span key={l} className="phone-field">{l}</span>)}
              <span className="phone-cta">{i < 2 ? 'המשך' : 'סיום'}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <ol className="phone-steps">
          {screens.map((s, n) => (
            <li key={n} className={n === i ? 'on' : ''}><button onClick={() => setI(n)}>{String(n + 1).padStart(2, '0')} · {s[0]}</button></li>
          ))}
        </ol>
      </div>
    </figure>
  )
}

function PilotViz({ rows }) {
  return (
    <figure className="pilot">
      <figcaption className="eyebrow">לפני ואחרי, שבועיים של פיילוט</figcaption>
      <div className="pilot-grid">
        {rows.map(([label, b, a, unit], n) => (
          <div className="pilot-cell" key={label}>
            <strong>{label}</strong>
            {[['לפני', b, 'before'], ['אחרי', a, 'after']].map(([k, v, cls], j) => (
              <div className="pilot-row" key={k}>
                <span className="mono">{k}</span>
                <div className="pilot-track">
                  <motion.i className={cls} initial={{ width: 0 }} whileInView={{ width: `${Math.max(2, (v / b) * 100)}%` }} viewport={{ once: true }} transition={{ delay: n * 0.15 + j * 0.3, duration: 0.7, ease: EASE }} />
                </div>
                <span className="mono" dir="ltr">{unit === '%' ? `${v}%` : `${v} ${unit}`}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </figure>
  )
}

function HandoverViz({ items }) {
  return (
    <figure className="handover">
      <figcaption className="eyebrow">רשימת מסירה</figcaption>
      <ul>
        {items.map((t, i) => (
          <motion.li key={t} initial={{ opacity: 0.3 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.25 }}>
            <motion.i initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.25, type: 'spring' }} aria-hidden="true" />
            {t}
          </motion.li>
        ))}
      </ul>
    </figure>
  )
}
