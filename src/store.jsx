import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, must, rpc } from './supabase.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const ID_KEY = 'cgh_identity'
const PROFILE_COLS = 'id, display_name, role, created_at'

function readIdentity() {
  try { return JSON.parse(localStorage.getItem(ID_KEY) || 'null') } catch { return null }
}
function writeIdentity(v) {
  try { v ? localStorage.setItem(ID_KEY, JSON.stringify(v)) : localStorage.removeItem(ID_KEY) } catch { /* private mode */ }
}

// Course skeleton is public and loads for every visitor.
async function loadCourse() {
  const [stages, deliverables, cohorts] = await Promise.all([
    supabase.from('cgh_stages').select('*').order('sort_order').then(must),
    supabase.from('cgh_deliverables').select('*').order('stage_id').order('sort_order').then(must),
    supabase.from('cgh_cohorts').select('*').order('starts_on', { ascending: false }).then(must),
  ])
  return { stages, deliverables, cohort: cohorts.find((c) => c.is_open) || cohorts[0] || null }
}

async function loadParticipant(enrollmentId) {
  const enrollment = await supabase.from('cgh_enrollments').select('*, cohort:cgh_cohorts(*)')
    .eq('id', enrollmentId).maybeSingle().then(must)
  if (!enrollment) return null
  const [submissions, anchor] = await Promise.all([
    supabase.from('cgh_submissions').select('*').eq('enrollment_id', enrollmentId).then(must),
    supabase.from('cgh_anchor_orgs').select('*').eq('enrollment_id', enrollmentId).maybeSingle().then(must),
  ])
  const ids = submissions.map((s) => s.id)
  const reviews = ids.length
    ? await supabase.from('cgh_reviews').select('*').in('submission_id', ids).order('created_at', { ascending: false }).then(must)
    : []
  return { enrollment, submissions, anchor, reviews }
}

async function loadMentor() {
  const [profiles, enrollments, submissions, anchors] = await Promise.all([
    supabase.from('cgh_profiles').select(PROFILE_COLS).then(must),
    supabase.from('cgh_enrollments').select('*').then(must),
    supabase.from('cgh_submissions').select('*').then(must),
    supabase.from('cgh_anchor_orgs').select('*').then(must),
  ])
  return { profiles, enrollments, submissions, anchors }
}

export function AppProvider({ children }) {
  const [identity, setIdentityState] = useState(readIdentity)
  const [course, setCourse] = useState(null)
  const [courseError, setCourseError] = useState(null)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState(null)

  const setIdentity = useCallback((v) => { writeIdentity(v); setIdentityState(v); setData(null) }, [])

  // A personal link (?k=<key>) restores a participant on any device.
  useEffect(() => {
    const url = new URL(window.location.href)
    const k = url.searchParams.get('k')
    if (!k) return
    url.searchParams.delete('k')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    rpc('cgh_whoami', { p_key: k }).then((who) => {
      if (who?.enrollment_id) setIdentity({ role: 'participant', key: k, enrollmentId: who.enrollment_id, name: who.name })
    }).catch(() => {})
  }, [setIdentity])

  const reloadCourse = useCallback(async () => {
    setCourseError(null)
    try { setCourse(await loadCourse()) } catch (e) { setCourseError(e) }
  }, [])
  useEffect(() => { reloadCourse() }, [reloadCourse])

  const reload = useCallback(async () => {
    if (!identity) { setData(null); setStatus('idle'); return }
    setStatus((s) => (s === 'ready' ? 'ready' : 'loading'))
    setError(null)
    try {
      if (identity.role === 'mentor') setData(await loadMentor())
      else {
        const d = await loadParticipant(identity.enrollmentId)
        if (!d) { setIdentity(null); return }
        setData(d)
      }
      setStatus('ready')
    } catch (e) { setError(e); setStatus('error') }
  }, [identity, setIdentity])
  useEffect(() => { reload() }, [reload])

  const join = useCallback(async (name) => {
    const r = await rpc('cgh_join', { p_name: name })
    setIdentity({ role: 'participant', key: r.key, enrollmentId: r.enrollment_id, name: r.name })
  }, [setIdentity])

  const value = useMemo(() => ({
    identity, setIdentity, join, course, courseError, reloadCourse, data, status, error, reload,
    isMentor: identity?.role === 'mentor',
  }), [identity, setIdentity, join, course, courseError, reloadCourse, data, status, error, reload])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// A stage is complete when every deliverable is approved (and the anchor org, for stage 0).
export function stageComplete(stageId, deliverables, submissions, anchor) {
  const ds = deliverables.filter((d) => d.stage_id === stageId)
  const ok = ds.every((d) => submissions.some((s) => s.deliverable_id === d.id && s.status === 'approved'))
  return stageId === 0 ? ok && anchor?.status === 'approved' : ok
}

export function personalLink(key) {
  return `${window.location.origin}/?k=${key}`
}
