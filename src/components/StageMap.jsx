import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { stageNumber } from '../lib.js'

// The eight stages as a stepped, layered strip. state(stage) -> 'done' | 'current' | 'next' | undefined
export default function StageMap({ stages, deliverables, state = () => undefined }) {
  return (
    <ol className="stagemap">
      {stages.map((s, i) => {
        const st = state(s)
        const count = deliverables.filter((d) => d.stage_id === s.id).length + (s.id === 0 ? 1 : 0)
        return (
          <motion.li
            key={s.id}
            className={`stage-tile ${st || ''}`}
            initial={{ opacity: 0, y: 24, rotateX: -12 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
            whileHover={{ y: -6 }}
          >
            <Link to={`/stage/${s.id}`} data-testid={`stage-${s.id}`}>
              <span className="tile-num mono">{stageNumber(s.id)}</span>
              <span className="tile-weeks mono">{s.weeks}</span>
              <strong className="tile-title">{s.title}</strong>
              <span className="tile-goal">{s.goal}</span>
              <span className="tile-foot mono">
                {count} תוצרים
                {st === 'current' && <em> · השלב שלך</em>}
                {st === 'done' && <em> · הושלם</em>}
              </span>
            </Link>
          </motion.li>
        )
      })}
    </ol>
  )
}
