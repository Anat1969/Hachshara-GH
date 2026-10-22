import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, must } from './supabase.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

// Course skeleton is public: stages and deliverables load for every visitor.
async function loadCourse() {
  const [stages, deliverables] = await Promise.all([
    supabase.from('cgh_stages').select('*').order('sort_order').then(must),
    supabase.from('cgh_deliverables').select('*').order('stage_id').order('sort_order').then(must),
  ])
  return { stages, deliverables }
}

async function loadParticipant(uid) {
  const enrollment = await supabase.from('cgh_enrollments')
    .select('*, cohort:cgh_cohorts(*)').eq('profile_id', uid).maybeSingle().then(must)
  if (!enrollment) return { enrollment: null, submissions: [], anchor: null, reviews: [] }
  const [submissions, anchor, reviews] = await Promise.all([
    supabase.from('cgh_submissions').select('*').eq('enrollment_id', enrollment.id).then(must),
    supabase.from('cgh_anchor_orgs').select('*').eq('enrollment_id', enrollment.id).maybeSingle().then(must),
    supabase.from('cgh_reviews').select('*').order('created_at', { ascending: false }).then(must),
  ])
  return { enrollment, submissions, anchor, reviews }
}

async function loadMentor() {
  const [profiles, enrollments, submissions, anchors, cohorts] = await Promise.all([
    supabase.from('cgh_profiles').select('*').then(must),
    supabase.from('cgh_enrollments').select('*').then(must),
    supabase.from('cgh_submissions').select('*').then(must),
    supabase.from('cgh_anchor_orgs').select('*').then(must),
    supabase.from('cgh_cohorts').select('*').order('starts_on', { ascending: false }).then(must),
  ])
  return { profiles, enrollments, submissions, anchors, cohorts }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [course, setCourse] = useState(null)
  const [courseError, setCourseError] = useState(null)
  const [me, setMe] = useState(null) // { role, profile }
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const reloadCourse = useCallback(async () => {
    setCourseError(null)
    try { setCourse(await loadCourse()) } catch (e) { setCourseError(e) }
  }, [])

  useEffect(() => { reloadCourse() }, [reloadCourse])

  const uid = session?.user?.id

  const reload = useCallback(async () => {
    if (!uid) { setMe(null); setData(null); setStatus('idle'); return }
    setStatus((s) => (s === 'ready' ? 'ready' : 'loading'))
    setError(null)
    try {
      const boot = await supabase.rpc('cgh_bootstrap').then(must)
      const profile = await supabase.from('cgh_profiles').select('*').eq('id', uid).maybeSingle().then(must)
      const role = boot?.role || profile?.role || 'participant'
      setMe({ role, profile })
      setData(role === 'mentor' ? await loadMentor() : await loadParticipant(uid))
      setStatus('ready')
    } catch (e) {
      setError(e)
      setStatus('error')
    }
  }, [uid])

  useEffect(() => { if (session !== undefined) reload() }, [session, reload])

  const value = useMemo(() => ({
    session, course, courseError, reloadCourse, me, data, status, error, reload,
    isMentor: me?.role === 'mentor',
  }), [session, course, courseError, reloadCourse, me, data, status, error, reload])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// A stage is complete when every deliverable is approved (and the anchor org, for stage 0).
export function stageComplete(stageId, deliverables, submissions, anchor) {
  const ds = deliverables.filter((d) => d.stage_id === stageId)
  const ok = ds.every((d) => submissions.some((s) => s.deliverable_id === d.id && s.status === 'approved'))
  return stageId === 0 ? ok && anchor?.status === 'approved' : ok
}
