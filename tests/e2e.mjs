// End-to-end test against `vite preview`, with every Supabase call mocked in-process.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const SUPA = 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
const REF = 'ktqmwpbzcnzkhjskqisy'
mkdirSync('tests/shots', { recursive: true })

let failures = 0
const ok = (cond, msg) => { if (cond) console.log('  ok  ', msg); else { failures++; console.log('  FAIL', msg) } }

// ---------- mock data ----------
const STAGES = [
  ['ארגון עוגן', 'שבוע 1', 1], ['מיפוי התהליך', 'שבוע 2', 2], ['הגדרת הבעיה', 'שבוע 3', 3], ['פירמידת פתרונות', 'שבוע 4', 4],
  ['אפיון', 'שבועות 5 עד 6', 6], ['אב טיפוס', 'שבועות 7 עד 8', 8], ['פיילוט בארגון', 'שבועות 9 עד 10', 10], ['הטמעה והצגה', 'שבועות 11 עד 12', 12],
].map(([title, weeks, due_week], id) => ({ id, title, goal: `מטרת שלב ${id}`, weeks, due_week, sort_order: id }))
const DELIVS = [
  { id: 'd0', stage_id: 0, title: 'מכתב כוונות מהארגון', description: 'אישור בכתב', sort_order: 1 },
  { id: 'd1', stage_id: 1, title: 'מפת התהליך', description: 'צעדים', sort_order: 1 },
  { id: 'd2', stage_id: 1, title: 'שיחה עם בעל התהליך', description: 'סיכום', sort_order: 2 },
]
const P_ID = '11111111-1111-1111-1111-111111111111'
const M_ID = '22222222-2222-2222-2222-222222222222'
const P2_ID = '33333333-3333-3333-3333-333333333333'
const COHORT = { id: 'c1', name: 'מחזור ראשון', starts_on: '2026-10-18', is_open: true }

function freshDb() {
  return {
    cgh_stages: structuredClone(STAGES),
    cgh_deliverables: structuredClone(DELIVS),
    cgh_cohorts: [COHORT],
    cgh_profiles: [
      { id: P_ID, display_name: 'נועה', email: 'noa@example.com', role: 'participant' },
      { id: P2_ID, display_name: 'אורי', email: 'uri@example.com', role: 'participant' },
      { id: M_ID, display_name: 'ענת', email: 'mentor@example.com', role: 'mentor' },
    ],
    cgh_enrollments: [
      { id: 'e1', cohort_id: 'c1', profile_id: P_ID, current_stage: 0, anchor_org_id: null },
      { id: 'e2', cohort_id: 'c1', profile_id: P2_ID, current_stage: 0, anchor_org_id: null },
    ],
    cgh_anchor_orgs: [
      { id: 'a2', enrollment_id: 'e2', org_name: 'מתנ"ס הדר', sector: 'culture', contact_name: 'דנה', pain_points: ['הרשמה', 'פניות', 'ארכיון'], status: 'submitted', submitted_at: '2026-10-19T10:00:00Z', updated_at: '2026-10-19T10:00:00Z', mentor_note: null },
    ],
    cgh_submissions: [
      { id: 's2', enrollment_id: 'e2', deliverable_id: 'd0', content: 'מכתב מהמנהלת', link: 'https://example.com/letter', status: 'submitted', submitted_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T10:00:00Z' },
    ],
    cgh_reviews: [],
  }
}

function b64url(o) { return Buffer.from(JSON.stringify(o)).toString('base64url') }
function sessionFor(uid, email) {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'google' }, user_metadata: {} }
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: uid, email, role: 'authenticated', exp, aud: 'authenticated' })}.sig`
  return { access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user }
}

// ---------- mock server ----------
async function mockSupabase(context, { role = null, google = true, failStages = false } = {}) {
  const db = freshDb()
  const log = []
  const uid = role === 'mentor' ? M_ID : role === 'participant' ? P_ID : null
  let stagesFailing = failStages

  await context.route(`${SUPA}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    const body = req.postData() ? JSON.parse(req.postData()) : null
    log.push({ method, path: url.pathname, search: url.search, body })
    const json = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

    if (url.pathname === '/auth/v1/settings') return json(200, { external: { google, email: true } })
    if (url.pathname.startsWith('/auth/v1/user')) return json(200, sessionFor(uid, 'x@example.com').user)
    if (url.pathname.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 })
    if (url.pathname.startsWith('/auth/v1/')) return json(200, {})

    const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([a-z_]+)/)
    if (!m) return json(404, {})
    const [, rpc, name] = m

    if (rpc) {
      if (name === 'cgh_bootstrap') return json(200, { role })
      if (name === 'cgh_review_submission') {
        const s = db.cgh_submissions.find((x) => x.id === body.p_submission)
        s.status = body.p_decision
        db.cgh_reviews.push({ id: 'r' + db.cgh_reviews.length, submission_id: s.id, decision: body.p_decision, note: body.p_note, created_at: new Date().toISOString() })
        return route.fulfill({ status: 204 })
      }
      if (name === 'cgh_review_anchor') {
        const a = db.cgh_anchor_orgs.find((x) => x.id === body.p_anchor)
        a.status = body.p_decision; a.mentor_note = body.p_note || null
        return route.fulfill({ status: 204 })
      }
      if (name === 'cgh_advance_stage') {
        const e = db.cgh_enrollments.find((x) => x.id === body.p_enrollment)
        e.current_stage += 1
        return json(200, e.current_stage)
      }
      return json(404, {})
    }

    if (name === 'cgh_stages' && stagesFailing && method === 'GET') return json(500, { message: 'boom' })
    const table = db[name]
    if (!table) return json(404, { message: 'no table' })

    const filters = [...url.searchParams.entries()].filter(([k, v]) => !['select', 'order', 'on_conflict', 'limit'].includes(k) && v.startsWith('eq.'))
    const match = (row) => filters.every(([k, v]) => String(row[k]) === v.slice(3))

    if (method === 'GET') {
      let rows = table.filter(match)
      if (name === 'cgh_enrollments' && url.searchParams.get('select')?.includes('cohort')) rows = rows.map((r) => ({ ...r, cohort: COHORT }))
      const accept = req.headers()['accept'] || ''
      if (accept.includes('vnd.pgrst.object')) {
        if (rows.length !== 1) return json(406, { code: 'PGRST116', message: 'no rows' })
        return json(200, rows[0])
      }
      return json(200, rows)
    }
    if (method === 'POST') {
      const items = Array.isArray(body) ? body : [body]
      const conflict = url.searchParams.get('on_conflict')?.split(',')
      for (const it of items) {
        const existing = conflict && table.find((r) => conflict.every((c) => r[c] === it[c]))
        const now = new Date().toISOString()
        if (existing) Object.assign(existing, it, { updated_at: now, submitted_at: it.status === 'submitted' ? now : existing.submitted_at })
        else table.push({ id: name + table.length, ...it, updated_at: now, submitted_at: it.status === 'submitted' ? now : null })
      }
      return route.fulfill({ status: 201 })
    }
    if (method === 'PATCH') {
      table.filter(match).forEach((r) => Object.assign(r, body))
      return route.fulfill({ status: 204 })
    }
    return json(405, {})
  })

  return { db, log, setStagesFailing: (v) => { stagesFailing = v } }
}

async function newPage(browser, { role, viewport = { width: 1360, height: 900 }, ...opts } = {}) {
  const context = await browser.newContext({ viewport, locale: 'he-IL', permissions: ['clipboard-read', 'clipboard-write'] })
  const mock = await mockSupabase(context, { role, ...opts })
  if (role) {
    const s = sessionFor(role === 'mentor' ? M_ID : P_ID, role === 'mentor' ? 'mentor@example.com' : 'noa@example.com')
    await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(s)])
  }
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()) })
  return { context, page, ...mock, errors }
}

async function noHorizontalScroll(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  ok(sw <= cw, `${label}: no horizontal scroll (${sw} <= ${cw})`)
}

const last = (log, method, path) => [...log].reverse().find((l) => l.method === method && l.path.includes(path))

// ---------- run ----------
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch()

try {
  console.log('Anonymous visitor')
  {
    const { page, log, errors, context } = await newPage(browser)
    await page.route('**/auth/v1/authorize**', (r) => r.fulfill({ status: 200, body: 'google' }))
    await page.goto(BASE + '/')
    await page.getByTestId('stage-7').waitFor()
    ok(await page.locator('.stage-tile').count() === 8, 'landing shows 8 stages')
    ok(await page.locator('header .brand').getAttribute('href') === '/', 'app name links home')
    await page.screenshot({ path: 'tests/shots/landing.png', fullPage: true })
    await page.getByTestId('copy-link').click()
    ok((await page.evaluate(() => navigator.clipboard.readText())) === BASE + '/', 'copy link copies current URL')
    ok(await page.getByTestId('dev-chat').getAttribute('href') === 'https://claude.ai/code/session_01XKjdfQUbKMrdERMAdgLonp', 'dev chat link')
    await page.getByTestId('stage-3').click()
    await page.waitForURL('**/stage/3')
    await page.locator('h1', { hasText: 'פירמידת פתרונות' }).waitFor()
    ok(true, 'stage page opens')
    await page.getByTestId('next-stage').click(); await page.waitForURL('**/stage/4')
    await page.getByTestId('prev-stage').click(); await page.waitForURL('**/stage/3')
    ok(true, 'pager works')
    await page.goto(BASE + '/stage/1')
    await page.getByTestId('deliv-1').click()
    ok(page.url().includes('?d=d1'), 'opening deliverable updates URL')
    ok(await page.getByText('כדי להגיש תוצר צריך להיכנס').isVisible(), 'anonymous sees sign-in hint')
    await page.getByTestId('copy-link').click()
    ok((await page.evaluate(() => navigator.clipboard.readText())).includes('/stage/1?d=d1'), 'copy link keeps state')
    await page.goto(BASE + '/')
    await page.getByTestId('hero-sign-in').click()
    await page.waitForURL('**/auth/v1/authorize**')
    ok(page.url().includes('provider=google'), 'sign-in goes to Google via Supabase')
    ok(log.some((l) => l.path === '/auth/v1/settings'), 'auth settings checked')
    // installability
    await page.goto(BASE + '/')
    const cdp = await context.newCDPSession(page)
    await page.waitForTimeout(800)
    const inst = await cdp.send('Page.getInstallabilityErrors')
    ok(inst.installabilityErrors.length === 0, `installable (${JSON.stringify(inst.installabilityErrors)})`)
    const manifest = await cdp.send('Page.getAppManifest')
    ok(manifest.errors.length === 0, 'manifest has no errors')
    ok(errors.length === 0, `no console errors ${errors.join(' | ')}`)
    await context.close()
  }

  console.log('Google disabled')
  {
    const { page, context } = await newPage(browser, { google: false })
    await page.goto(BASE + '/')
    await page.getByTestId('google-off').waitFor()
    await page.getByTestId('hero-sign-in').click()
    await page.getByTestId('notice').waitFor()
    ok(await page.getByTestId('notice').innerText().then((t) => t.includes('לא הופעלה')), 'clear message when Google is off, no password form')
    ok(await page.locator('input[type=password]').count() === 0, 'no password field')
    await context.close()
  }

  console.log('Error state')
  {
    const { page, context, setStagesFailing } = await newPage(browser, { failStages: true })
    await page.goto(BASE + '/')
    await page.getByTestId('retry').waitFor()
    setStagesFailing(false)
    await page.getByTestId('retry').click()
    await page.getByTestId('stage-0').waitFor()
    ok(true, 'retry recovers from error')
    await context.close()
  }

  console.log('Participant')
  {
    const { page, log, db, errors, context } = await newPage(browser, { role: 'participant' })
    await page.goto(BASE + '/')
    await page.getByTestId('open-current').waitFor()
    ok(log.some((l) => l.path.endsWith('/rpc/cgh_bootstrap')), 'bootstrap rpc called')
    ok(await page.getByText('שלום, נועה').isVisible(), 'greets participant')
    await page.screenshot({ path: 'tests/shots/participant-home.png', fullPage: true })
    await page.getByTestId('open-next').click()
    await page.waitForURL('**/anchor')
    await page.getByTestId('anchor-submit').click()
    await page.getByTestId('notice').waitFor()
    await page.getByRole('button', { name: 'הבנתי' }).click()
    await page.getByTestId('org-name').fill('ספריית בית אריאלה')
    await page.getByTestId('sector-municipality').click()
    await page.getByTestId('anchor-draft').click()
    await page.getByText('נשמר כטיוטה').waitFor()
    let req = last(log, 'POST', 'cgh_anchor_orgs')
    ok(req?.body.status === 'draft' && req.body.sector === 'municipality' && req.body.enrollment_id === 'e1', 'anchor draft saved')
    await page.getByTestId('contact').fill('רונית')
    for (const i of [0, 1, 2]) await page.getByTestId(`pain-${i}`).fill(`תהליך ${i + 1}`)
    await page.getByTestId('anchor-submit').click()
    await page.getByTestId('anchor-cancel').waitFor()
    req = last(log, 'POST', 'cgh_anchor_orgs')
    ok(req?.body.status === 'submitted' && req.body.pain_points.length === 3, 'anchor submitted with 3 pain points')
    await page.getByTestId('anchor-cancel').click()
    await page.getByTestId('anchor-submit').waitFor()
    ok(last(log, 'PATCH', 'cgh_anchor_orgs')?.body.status === 'draft', 'anchor submission cancelled')
    await page.getByTestId('anchor-submit').click()
    await page.getByTestId('anchor-cancel').waitFor()

    await page.goto(BASE + '/stage/0')
    await page.getByTestId('deliv-1').click()
    await page.getByTestId('sub-content').fill('המנהלת אישרה במייל')
    await page.getByTestId('sub-link').fill('https://example.com/mail')
    await page.getByTestId('save-draft').click()
    await page.getByText('נשמר כטיוטה').waitFor()
    req = last(log, 'POST', 'cgh_submissions')
    ok(req?.body.status === 'draft' && req.body.deliverable_id === 'd0' && req.body.link === 'https://example.com/mail', 'deliverable draft saved')
    ok(log.some((l) => l.search.includes('on_conflict=enrollment_id%2Cdeliverable_id') || l.search.includes('on_conflict=enrollment_id,deliverable_id')), 'upsert uses unique key')
    await page.getByTestId('submit').click()
    await page.getByTestId('cancel-submit').waitFor()
    ok(last(log, 'POST', 'cgh_submissions')?.body.status === 'submitted', 'deliverable submitted')
    ok(await page.getByTestId('sub-content').isDisabled(), 'submitted content is locked')
    await page.getByTestId('cancel-submit').click()
    await page.getByTestId('submit').waitFor()
    ok(last(log, 'PATCH', 'cgh_submissions')?.body.status === 'draft', 'submission cancelled back to draft')
    await page.getByTestId('submit').click()
    await page.getByTestId('cancel-submit').waitFor()

    // Returned with note
    db.cgh_submissions.find((s) => s.enrollment_id === 'e1').status = 'returned'
    db.cgh_reviews.push({ id: 'rx', submission_id: db.cgh_submissions.find((s) => s.enrollment_id === 'e1').id, decision: 'returned', note: 'חסרה חתימה', created_at: new Date().toISOString() })
    await page.reload()
    await page.getByTestId('mentor-note').waitFor()
    ok((await page.getByTestId('mentor-note').innerText()).includes('חסרה חתימה'), 'returned deliverable shows mentor note')
    ok(!(await page.getByTestId('sub-content').isDisabled()), 'returned deliverable is editable')

    await page.goto(BASE + '/stage/3')
    await page.getByText('השלב הזה ייפתח').waitFor()
    ok(true, 'future stage is marked closed')
    await page.goto(BASE + '/mentor')
    await page.getByText('אין גישה לדף הזה').waitFor()
    ok(true, 'participant gets no-access state on mentor page')
    await page.getByTestId('sign-out').click()
    await page.getByTestId('hero-sign-in').waitFor()
    ok(true, 'sign out returns to landing')
    ok(errors.length === 0, `no console errors ${errors.join(' | ')}`)
    await context.close()
  }

  console.log('Mentor')
  {
    const { page, log, db, errors, context } = await newPage(browser, { role: 'mentor' })
    await page.goto(BASE + '/')
    await page.getByTestId('stat-1').waitFor()
    ok((await page.getByTestId('stat-1').innerText()).startsWith('2'), 'mentor home counts 2 pending')
    await page.screenshot({ path: 'tests/shots/mentor-home.png', fullPage: true })
    await page.getByTestId('stat-1').click()
    await page.waitForURL('**/mentor')
    const items = page.locator('[data-testid^="q-"]')
    await items.nth(1).waitFor()
    ok(await items.count() === 2, 'queue lists 2 items')
    ok((await items.first().innerText()).includes('ארגון עוגן'), 'queue sorted oldest first')
    // Anchor: return without note is blocked, then with note
    await items.first().click()
    await page.getByTestId('return').click()
    await page.getByTestId('notice').waitFor()
    await page.getByRole('button', { name: 'הבנתי' }).click()
    ok(!log.some((l) => l.path.endsWith('cgh_review_anchor')), 'return without note not sent')
    await page.screenshot({ path: 'tests/shots/mentor-review.png', fullPage: true })
    await page.getByTestId('approve').click()
    await page.waitForFunction(() => document.querySelectorAll('[data-testid^="q-"]').length === 1)
    ok(last(log, 'POST', 'rpc/cgh_review_anchor')?.body.p_decision === 'approved', 'anchor approved in 2 clicks')
    // Submission approve -> stage complete -> advance
    await page.locator('[data-testid^="q-s:"]').click()
    await page.getByTestId('review-note').fill('מצוין')
    await page.getByTestId('approve').click()
    await page.getByTestId('advance-e2').waitFor()
    const r = last(log, 'POST', 'rpc/cgh_review_submission')
    ok(r?.body.p_submission === 's2' && r.body.p_note === 'מצוין', 'submission approve sends note')
    await page.getByTestId('advance-e2').click()
    await page.getByTestId('notice').waitFor()
    ok(last(log, 'POST', 'rpc/cgh_advance_stage')?.body.p_enrollment === 'e2', 'advance stage rpc sent')
    ok(db.cgh_enrollments.find((e) => e.id === 'e2').current_stage === 1, 'participant moved to stage 1')
    await page.getByRole('button', { name: 'הבנתי' }).click()
    ok(await page.getByText('אין מה לבדוק כרגע').isVisible(), 'empty queue state')

    // Group table + filters
    db.cgh_submissions.push({ id: 's9', enrollment_id: 'e1', deliverable_id: 'd0', content: 'x', status: 'returned', updated_at: new Date().toISOString() })
    await page.goto(BASE + '/mentor/group')
    await page.locator('tbody tr').first().waitFor()
    ok(await page.locator('tbody tr').count() === 2, 'group table lists 2')
    await page.getByTestId('filter-returned').click()
    ok(page.url().includes('status=returned') && await page.locator('tbody tr').count() === 1, 'filter returned')
    await page.getByTestId('filter-ready').click()
    ok(await page.getByText('אין משתתפים בסינון הזה').isVisible(), 'filter ready empty state')
    await page.getByTestId('filter-pending').click()
    await page.getByTestId('filter-all').click()
    ok(await page.locator('tbody tr').count() === 2, 'filter all')
    await page.screenshot({ path: 'tests/shots/mentor-group.png', fullPage: true })

    // In-page editing
    await page.goto(BASE + '/stage/1')
    await page.getByTestId('edit-toggle').click()
    await page.getByTestId('stage-title-input').fill('מיפוי התהליך בשטח')
    await page.getByTestId('stage-save').click()
    await page.getByTestId('notice').waitFor()
    ok(last(log, 'PATCH', 'cgh_stages')?.body.title === 'מיפוי התהליך בשטח', 'stage edit sends PATCH')
    await page.getByRole('button', { name: 'הבנתי' }).click()
    await page.getByTestId('deliv-save-1').click()
    await page.getByTestId('notice').waitFor()
    ok(last(log, 'PATCH', 'cgh_deliverables') !== undefined, 'deliverable edit sends PATCH')
    await page.getByRole('button', { name: 'הבנתי' }).click()
    await page.getByTestId('new-deliv').fill('תוצר חדש')
    await page.getByTestId('add-deliv').click()
    await page.waitForFunction(() => document.querySelectorAll('.deliv-edit').length >= 4)
    ok(last(log, 'POST', 'cgh_deliverables')?.body.stage_id === 1, 'add deliverable sends POST')
    await page.getByTestId('edit-toggle').click()
    ok(await page.locator('h1').innerText() === 'מיפוי התהליך בשטח', 'edited title shown')
    ok(errors.length === 0, `no console errors ${errors.join(' | ')}`)
    await context.close()
  }

  console.log('Mobile')
  for (const role of [null, 'participant', 'mentor']) {
    const { page, context } = await newPage(browser, { role, viewport: { width: 375, height: 800 } })
    const paths = role === 'mentor' ? ['/', '/mentor', '/mentor/group', '/stage/1'] : role ? ['/', '/anchor', '/stage/0'] : ['/', '/stage/2']
    for (const p of paths) {
      await page.goto(BASE + p)
      await page.waitForTimeout(700)
      await noHorizontalScroll(page, `${role || 'anon'} ${p}`)
    }
    await page.getByTestId('menu').click()
    await page.locator('.drawer [data-testid="copy-link"]').click()
    ok(await page.locator('.drawer').isVisible(), `${role || 'anon'} mobile menu opens`)
    await noHorizontalScroll(page, `${role || 'anon'} menu open`)
    await page.screenshot({ path: `tests/shots/mobile-${role || 'anon'}.png`, fullPage: true })
    await context.close()
  }
} catch (e) {
  failures++
  console.log('  FAIL threw:', e.message)
} finally {
  await browser.close()
  server.kill()
}

console.log(failures ? `\n${failures} failures` : '\nall green')
process.exit(failures ? 1 : 0)
