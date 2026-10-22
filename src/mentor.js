import { stageComplete } from './store.jsx'

// Joins mentor data into one row per enrollment.
export function buildRows(course, data) {
  const byProfile = Object.fromEntries(data.profiles.map((p) => [p.id, p]))
  return data.enrollments.map((e) => {
    const subs = data.submissions.filter((s) => s.enrollment_id === e.id)
    const anchor = data.anchors.find((a) => a.enrollment_id === e.id) || null
    const pending = subs.filter((s) => s.status === 'submitted').length + (anchor?.status === 'submitted' ? 1 : 0)
    const returned = subs.filter((s) => s.status === 'returned').length + (anchor?.status === 'returned' ? 1 : 0)
    const handedIn = subs.filter((s) => s.status !== 'draft').length + (anchor && anchor.status !== 'draft' ? 1 : 0)
    const ready = e.current_stage < 7 && stageComplete(e.current_stage, course.deliverables, subs, anchor)
    const p = byProfile[e.profile_id]
    return { e, name: p?.display_name || p?.email || 'משתתף', email: p?.email, subs, anchor, pending, returned, handedIn, ready }
  })
}

export function buildQueue(course, data) {
  const rows = buildRows(course, data)
  const byEnrollment = Object.fromEntries(rows.map((r) => [r.e.id, r]))
  const items = []
  for (const s of data.submissions.filter((x) => x.status === 'submitted')) {
    const d = course.deliverables.find((x) => x.id === s.deliverable_id)
    const r = byEnrollment[s.enrollment_id]
    items.push({ key: `s:${s.id}`, kind: 'submission', id: s.id, at: s.submitted_at || s.updated_at, who: r?.name, row: r, title: d?.title || 'תוצר', stageId: d?.stage_id, content: s.content, link: s.link })
  }
  for (const a of data.anchors.filter((x) => x.status === 'submitted')) {
    const r = byEnrollment[a.enrollment_id]
    items.push({ key: `a:${a.id}`, kind: 'anchor', id: a.id, at: a.submitted_at || a.updated_at, who: r?.name, row: r, title: 'ארגון עוגן', stageId: 0, anchor: a })
  }
  return items.sort((x, y) => new Date(x.at) - new Date(y.at))
}
