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
      { id: P_ID, display_name: 'נועה', role: 'participant', edit_key: 'key-noa' },
      { id: P2_ID, display_name: 'אורי', role: 'participant', edit_key: 'key-uri' },
      
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

// ---------- mock server ----------
async function mockSupabase(context, { failStages = false } = {}) {
  const db = freshDb()
  const log = []
  let stagesFailing = failStages

  await context.route(`${SUPA}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    const body = req.postData() ? JSON.parse(req.postData()) : null
    log.push({ method, path: url.pathname, search: url.search, body })
    const json = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

    if (url.pathname.startsWith('/auth/v1/')) { log.push({ method, path: 'AUTH-CALL' }); return json(200, {}) }

    const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([a-z_]+)/)
    if (!m) return json(404, {})
    const [, rpc, name] = m
    const now = new Date().toISOString()
    const enrollmentForKey = (k) => db.cgh_enrollments.find((e) => e.profile_id === db.cgh_profiles.find((p) => p.edit_key === k)?.id)

    if (rpc) {
      if (name === 'cgh_join') {
        const pid = 'p' + db.cgh_profiles.length, key = 'key-' + pid, eid = 'e' + (db.cgh_enrollments.length + 1)
        db.cgh_profiles.push({ id: pid, display_name: body.p_name, role: 'participant', edit_key: key })
        db.cgh_enrollments.push({ id: eid, cohort_id: 'c1', profile_id: pid, current_stage: 0, anchor_org_id: null })
        return json(200, { key, profile_id: pid, enrollment_id: eid, name: body.p_name })
      }
      if (name === 'cgh_whoami') {
        const e = enrollmentForKey(body.p_key)
        return json(200, e ? { profile_id: e.profile_id, name: db.cgh_profiles.find((p) => p.id === e.profile_id).display_name, enrollment_id: e.id } : null)
      }
      if (name === 'cgh_save_submission') {
        const e = enrollmentForKey(body.p_key)
        if (!e) return json(400, { message: 'unknown key' })
        let s = db.cgh_submissions.find((x) => x.enrollment_id === e.id && x.deliverable_id === body.p_deliverable)
        if (!s) { s = { id: 'sub' + db.cgh_submissions.length, enrollment_id: e.id, deliverable_id: body.p_deliverable }; db.cgh_submissions.push(s) }
        Object.assign(s, { content: body.p_content, link: body.p_link || null, status: body.p_status, updated_at: now, submitted_at: body.p_status === 'submitted' ? now : null })
        return route.fulfill({ status: 204 })
      }
      if (name === 'cgh_save_anchor') {
        const e = enrollmentForKey(body.p_key)
        let a = db.cgh_anchor_orgs.find((x) => x.enrollment_id === e.id)
        if (!a) { a = { id: 'anc' + db.cgh_anchor_orgs.length, enrollment_id: e.id, mentor_note: null }; db.cgh_anchor_orgs.push(a) }
        Object.assign(a, { org_name: body.p_org, sector: body.p_sector, contact_name: body.p_contact, pain_points: body.p_pains, status: body.p_status, updated_at: now, submitted_at: body.p_status === 'submitted' ? now : null })
        return route.fulfill({ status: 204 })
      }
      if (name === 'cgh_review_submission') {
        const s = db.cgh_submissions.find((x) => x.id === body.p_submission)
        s.status = body.p_decision
        db.cgh_reviews.push({ id: 'r' + db.cgh_reviews.length, submission_id: s.id, decision: body.p_decision, note: body.p_note, created_at: now })
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
      if (name === 'cgh_save_stage') {
        Object.assign(db.cgh_stages.find((x) => x.id === body.p_id), { title: body.p_title, goal: body.p_goal, weeks: body.p_weeks })
        return route.fulfill({ status: 204 })
      }
      if (name === 'cgh_save_deliverable') {
        if (body.p_id) Object.assign(db.cgh_deliverables.find((x) => x.id === body.p_id), { title: body.p_title, description: body.p_description })
        else db.cgh_deliverables.push({ id: 'dn' + db.cgh_deliverables.length, stage_id: body.p_stage, title: body.p_title, description: '', sort_order: body.p_sort })
        return json(200, 'x')
      }
      return json(404, {})
    }

    if (name === 'cgh_stages' && stagesFailing && method === 'GET') return json(500, { message: 'boom' })
    const table = db[name]
    if (!table) return json(404, { message: 'no table' })

    const filters = [...url.searchParams.entries()].filter(([k, v]) => !['select', 'order', 'on_conflict', 'limit'].includes(k) && v.startsWith('eq.'))
    const ins = [...url.searchParams.entries()].filter(([, v]) => v.startsWith('in.('))
    const match = (row) => filters.every(([k, v]) => String(row[k]) === v.slice(3))
      && ins.every(([k, v]) => v.slice(4, -1).split(',').map((x) => x.replace(/"/g, '')).includes(String(row[k])))
    if (name === 'cgh_profiles' && method === 'GET' && url.searchParams.get('select')?.includes('edit_key')) return json(403, {})

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
  const mock = await mockSupabase(context, opts)
  if (role) {
    const id = role === 'mentor' ? { role: 'mentor', name: 'ענת' } : { role: 'participant', key: 'key-noa', enrollmentId: 'e1', name: 'נועה' }
    await context.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('cgh_identity', v); sessionStorage.setItem('seeded', '1') } }, JSON.stringify(id))
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
const openMenu = async (page) => { if (!(await page.locator('#owner-panel').isVisible())) await page.getByTestId('menu').click(); await page.locator('#owner-panel').waitFor() }
const dismiss = async (page) => { await page.getByTestId('notice').waitFor(); await page.getByRole('button', { name: 'הבנתי' }).click() }

// ---------- run ----------
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch()

try {
  console.log('Visitor and free entry')
  {
    const { page, log, errors, context, db } = await newPage(browser)
    await page.goto(BASE + '/')
    await page.getByTestId('stage-7').waitFor()
    ok(await page.locator('.stage-tile').count() === 8, 'landing shows 8 stage tiles')
    ok(await page.locator('[data-testid^="floor-"]').count() === 8, 'tower shows 8 floors')
    ok(await page.locator('.lane-bar').count() === 8, 'week timeline shows 8 stages')
    ok(await page.locator('input[type=password]').count() === 0, 'no password field')
    ok(!log.some((l) => l.path === 'AUTH-CALL'), 'no auth calls at all')
    ok(await page.locator('header .brand').getAttribute('href') === '/', 'app name links home')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'tests/shots/landing.png', fullPage: true })
    // Owner panel under Anat's logo
    ok(await page.locator('.topbar-inner [data-testid="copy-link"], .topbar-inner [data-testid="dev-chat"]').count() === 0, 'no utility buttons in the main bar')
    ok(await page.locator('.topbar-inner .anat-mark[aria-label="אד׳ ענת שטיבלמן"]').count() === 1, "Anat's mark sits in the main bar")
    const markBox = await page.locator('.owner').boundingBox()
    ok(markBox.x < 400, `mark on the left side of the bar (x ${Math.round(markBox.x)})`)
    await openMenu(page)
    await page.getByTestId('copy-link').click()
    ok((await page.evaluate(() => navigator.clipboard.readText())) === BASE + '/', 'copy link copies current URL')
    ok(await page.getByTestId('dev-chat').getAttribute('href') === 'https://claude.ai/code/session_01XKjdfQUbKMrdERMAdgLonp', 'dev chat link under the logo')
    await page.keyboard.press('Escape')
    // Tower floor -> stage
    await page.getByTestId('floor-3').click()
    await page.waitForURL('**/stage/3')
    await page.locator('h1', { hasText: 'פירמידת פתרונות' }).waitFor()
    ok(true, 'tower floor opens its stage')
    await page.getByTestId('pyr-3').click()
    ok(await page.locator('.pyr-cap strong').innerText() === 'AI', 'pyramid level selects')
    await page.getByTestId('next-stage').click(); await page.waitForURL('**/stage/4')
    await page.getByTestId('prev-stage').click(); await page.waitForURL('**/stage/3')
    ok(true, 'pager works')
    await page.goto(BASE + '/stage/1')
    await page.getByTestId('deliv-1').click()
    ok(page.url().includes('?d=d1'), 'opening deliverable updates URL')
    await openMenu(page)
    await page.getByTestId('copy-link').click()
    ok((await page.evaluate(() => navigator.clipboard.readText())).includes('/stage/1?d=d1'), 'copy link keeps state')
    // Join by name
    await page.goto(BASE + '/')
    await page.getByTestId('join').click()
    await dismiss(page)
    await page.getByTestId('join-name').fill('דנה לוי')
    await page.getByTestId('join').click()
    await page.getByTestId('open-current').waitFor()
    ok(last(log, 'POST', 'rpc/cgh_join')?.body.p_name === 'דנה לוי', 'join sends the name')
    ok(await page.getByText('שלום, דנה לוי').isVisible(), 'greets the new participant')
    await openMenu(page)
    await page.getByTestId('copy-personal').click()
    const personal = await page.evaluate(() => navigator.clipboard.readText())
    ok(personal.includes('/?k=key-p'), 'personal link holds the key')
    // Restore from personal link in a fresh context
    await page.getByTestId('sign-out').click()
    await page.getByTestId('join').waitFor()
    ok(true, 'switch user returns to entry')
    await page.goto(personal)
    await page.getByText('שלום, דנה לוי').waitFor()
    ok(!page.url().includes('k='), 'personal link restores identity and hides the key')
    // installability
    const cdp = await context.newCDPSession(page)
    await page.waitForTimeout(800)
    const inst = await cdp.send('Page.getInstallabilityErrors')
    ok(inst.installabilityErrors.length === 0, `installable (${JSON.stringify(inst.installabilityErrors)})`)
    ok((await cdp.send('Page.getAppManifest')).errors.length === 0, 'manifest has no errors')
    ok(errors.length === 0, `no console errors ${errors.join(' | ')}`)
    void db
    await context.close()
  }

  console.log('End-to-end example')
  {
    const { page, errors, context } = await newPage(browser)
    await page.goto(BASE + '/')
    await page.getByTestId('to-example').click()
    await page.waitForURL('**/example**')
    await page.locator('.ex-stage').nth(7).waitFor()
    ok(await page.locator('.ex-stage').count() === 8, 'example has 8 stages')
    ok(await page.locator('.seq').count() === 8, 'sequence of 8 questions')
    await page.getByTestId('seq-5').click()
    await page.waitForFunction(() => location.search.includes('s=5'))
    await page.waitForTimeout(1000)
    ok(await page.locator('#s-5.on').count() === 1, 'question jumps to its stage and marks it')
    ok(await page.locator('.slab.cur').count() === 1, 'tower follows the active stage')
    await page.locator('#s-3 [data-testid="opt-0"]').click()
    await page.locator('#s-3 .opt-card strong', { hasText: 'שינוי תהליך' }).waitFor({ timeout: 4000 }).catch(() => {})
    ok((await page.locator('#s-3 .opt-card strong').innerText()) === 'שינוי תהליך', 'options viz switches')
    await page.locator('#s-0 [data-testid="copy-sample"]').first().click()
    ok((await page.evaluate(() => navigator.clipboard.readText())).includes('ספריית הקהילה'), 'copy sample text')
    await page.goto(BASE + '/example?s=6')
    await page.waitForTimeout(1200)
    ok(await page.locator('#s-6.on').count() === 1, 'link with ?s= opens at that stage')
    const top6 = await page.locator('#s-6').evaluate((el) => el.getBoundingClientRect().top)
    ok(top6 > 0 && top6 < 400, `link with ?s= scrolls to the stage (top ${Math.round(top6)})`)
    // Second example: architecture
    await page.goto(BASE + '/example')
    await page.getByTestId('ex-binui').click()
    await page.waitForFunction(() => location.search.includes('e=binui'))
    await page.locator('h1', { hasText: 'תוכנית בינוי' }).waitFor()
    ok((await page.locator('.thread-v').first().innerText()) === '45', 'architecture example has its own metric thread')
    await page.getByTestId('seq-5').click()
    await page.waitForFunction(() => location.search.includes('e=binui') && location.search.includes('s=5'))
    await page.locator('#s-5 .phone.desktop').waitFor()
    ok(true, 'architecture prototype shows a desktop screen and keeps the example in the URL')
    await page.goto(BASE + '/example?e=binui&s=3')
    await page.waitForTimeout(1200)
    ok((await page.locator('#s-3 .opt-card strong').innerText()) === 'AI', 'architecture example chose the AI layer')
    await page.getByTestId('ex-library').click()
    await page.locator('h1', { hasText: 'ספרייה' }).waitFor()
    ok(!page.url().includes('e=binui'), 'switch back to the library example')
    await page.goto(BASE + '/stage/2')
    await page.getByTestId('stage-example').click()
    await page.waitForURL('**/example?s=2')
    ok(true, 'stage page links to its place in the example')
    await page.goto(BASE + '/example')
    for (let y = 0; y < 9000; y += 500) { await page.mouse.wheel(0, 500); await page.waitForTimeout(120) }
    await page.waitForTimeout(800)
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400)
    await page.screenshot({ path: 'tests/shots/example.png', fullPage: true })
    ok(errors.length === 0, `no console errors ${errors.join(' | ')}`)
    await context.close()
  }

  console.log('Error state')
  {
    const { page, context, setStagesFailing } = await newPage(browser, { failStages: true })
    await page.goto(BASE + '/stage/2')
    await page.getByTestId('retry').waitFor()
    setStagesFailing(false)
    await page.getByTestId('retry').click()
    await page.locator('h1', { hasText: 'הגדרת הבעיה' }).waitFor()
    ok(true, 'retry recovers from error')
    await context.close()
  }

  console.log('Participant')
  {
    const { page, log, db, errors, context } = await newPage(browser, { role: 'participant' })
    await page.goto(BASE + '/')
    await page.getByTestId('open-current').waitFor()
    ok(await page.getByText('שלום, נועה').isVisible(), 'greets participant')
    ok(await page.locator('.ring').count() === 1, 'due ring shown')
    ok(await page.locator('.statusbar .legend li').count() >= 1, 'status bar has a legend')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: 'tests/shots/participant-home.png', fullPage: true })
    await page.getByTestId('open-next').click()
    await page.waitForURL('**/anchor')
    await page.getByTestId('anchor-submit').click()
    await dismiss(page)
    await page.getByTestId('org-name').fill('ספריית בית אריאלה')
    ok(await page.locator('.org-block strong').innerText() === 'ספריית בית אריאלה', 'live preview follows the form')
    await page.getByTestId('sector-municipality').click()
    await page.getByTestId('anchor-draft').click()
    await page.getByText('נשמר כטיוטה').waitFor()
    let req = last(log, 'POST', 'rpc/cgh_save_anchor')
    ok(req?.body.p_status === 'draft' && req.body.p_sector === 'municipality' && req.body.p_key === 'key-noa', 'anchor draft saved with key')
    await page.getByTestId('contact').fill('רונית')
    for (const i of [0, 1, 2]) await page.getByTestId(`pain-${i}`).fill(`תהליך ${i + 1}`)
    await page.getByTestId('anchor-submit').click()
    await page.getByTestId('anchor-cancel').waitFor()
    req = last(log, 'POST', 'rpc/cgh_save_anchor')
    ok(req?.body.p_status === 'submitted' && req.body.p_pains.length === 3, 'anchor submitted with 3 pain points')
    await page.screenshot({ path: 'tests/shots/anchor.png', fullPage: true })
    await page.getByTestId('anchor-cancel').click()
    await page.getByTestId('anchor-submit').waitFor()
    ok(last(log, 'POST', 'rpc/cgh_save_anchor')?.body.p_status === 'draft', 'anchor submission cancelled')

    await page.goto(BASE + '/stage/0')
    await page.getByTestId('deliv-1').click()
    await page.getByTestId('sub-content').fill('המנהלת אישרה במייל')
    await page.getByTestId('sub-link').fill('https://example.com/mail')
    await page.getByTestId('save-draft').click()
    await page.getByText('נשמר כטיוטה').waitFor()
    req = last(log, 'POST', 'rpc/cgh_save_submission')
    ok(req?.body.p_status === 'draft' && req.body.p_deliverable === 'd0' && req.body.p_link === 'https://example.com/mail', 'deliverable draft saved')
    await page.getByTestId('submit').click()
    await page.getByTestId('cancel-submit').waitFor()
    ok(last(log, 'POST', 'rpc/cgh_save_submission')?.body.p_status === 'submitted', 'deliverable submitted')
    ok(await page.getByTestId('sub-content').isDisabled(), 'submitted content is locked')
    await page.getByTestId('cancel-submit').click()
    await page.getByTestId('submit').waitFor()
    ok(last(log, 'POST', 'rpc/cgh_save_submission')?.body.p_status === 'draft', 'submission cancelled back to draft')
    await page.getByTestId('submit').click()
    await page.getByTestId('cancel-submit').waitFor()

    const mine = db.cgh_submissions.find((s) => s.enrollment_id === 'e1')
    mine.status = 'returned'
    db.cgh_reviews.push({ id: 'rx', submission_id: mine.id, decision: 'returned', note: 'חסרה חתימה', created_at: new Date().toISOString() })
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
    ok(errors.length === 0, `no console errors ${errors.join(' | ')}`)
    await context.close()
  }

  console.log('Mentor')
  {
    const { page, log, db, errors, context } = await newPage(browser, { role: 'mentor' })
    await page.goto(BASE + '/')
    await page.getByTestId('stat-1').waitFor()
    ok((await page.getByTestId('stat-1').innerText()).startsWith('2'), 'mentor home counts 2 pending')
    ok(await page.locator('.col').count() === 8, 'participants-per-stage chart')
    ok(!log.some((l) => l.path.includes('cgh_profiles') && l.search.includes('edit_key')), 'never asks for edit keys')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: 'tests/shots/mentor-home.png', fullPage: true })
    await page.getByTestId('stat-1').click()
    await page.waitForURL('**/mentor')
    const items = page.locator('[data-testid^="q-"]')
    await items.nth(1).waitFor()
    ok(await items.count() === 2, 'queue lists 2 items')
    ok((await items.first().innerText()).includes('ארגון עוגן'), 'queue sorted oldest first')
    await items.first().click()
    await page.getByTestId('return').click()
    await dismiss(page)
    ok(!log.some((l) => l.path.endsWith('cgh_review_anchor')), 'return without note not sent')
    await page.screenshot({ path: 'tests/shots/mentor-review.png', fullPage: true })
    await page.getByTestId('approve').click()
    await page.waitForFunction(() => document.querySelectorAll('[data-testid^="q-"]').length === 1)
    const ra = last(log, 'POST', 'rpc/cgh_review_anchor')
    ok(ra?.body.p_decision === 'approved' && ra.body.p_mentor === 'ענת', 'anchor approved in 2 clicks, with mentor name')
    await page.locator('[data-testid^="q-s:"]').click()
    await page.getByTestId('review-note').fill('מצוין')
    await page.getByTestId('approve').click()
    await page.getByTestId('advance-e2').waitFor()
    const r = last(log, 'POST', 'rpc/cgh_review_submission')
    ok(r?.body.p_submission === 's2' && r.body.p_note === 'מצוין', 'submission approve sends note')
    await page.getByTestId('advance-e2').click()
    await dismiss(page)
    ok(last(log, 'POST', 'rpc/cgh_advance_stage')?.body.p_enrollment === 'e2', 'advance stage rpc sent')
    ok(db.cgh_enrollments.find((e) => e.id === 'e2').current_stage === 1, 'participant moved to stage 1')
    ok(await page.getByText('אין מה לבדוק כרגע').isVisible(), 'empty queue state')

    db.cgh_submissions.push({ id: 's9', enrollment_id: 'e1', deliverable_id: 'd0', content: 'x', status: 'returned', updated_at: new Date().toISOString() })
    await page.goto(BASE + '/mentor/group')
    await page.locator('tbody tr').first().waitFor()
    ok(await page.locator('tbody tr').count() === 2, 'group table lists 2')
    ok(await page.locator('tbody .track').count() === 2, 'stage track per participant')
    await page.getByTestId('filter-returned').click()
    ok(page.url().includes('status=returned') && await page.locator('tbody tr').count() === 1, 'filter returned')
    await page.getByTestId('filter-ready').click()
    ok(await page.getByText('אין משתתפים בסינון הזה').isVisible(), 'filter ready empty state')
    await page.getByTestId('filter-pending').click()
    await page.getByTestId('filter-all').click()
    ok(await page.locator('tbody tr').count() === 2, 'filter all')
    await page.screenshot({ path: 'tests/shots/mentor-group.png', fullPage: true })

    await page.goto(BASE + '/stage/1')
    await page.getByTestId('edit-toggle').click()
    await page.getByTestId('stage-title-input').fill('מיפוי התהליך בשטח')
    await page.getByTestId('stage-save').click()
    await dismiss(page)
    ok(last(log, 'POST', 'rpc/cgh_save_stage')?.body.p_title === 'מיפוי התהליך בשטח', 'stage edit sends rpc')
    await page.getByTestId('deliv-save-1').click()
    await dismiss(page)
    ok(last(log, 'POST', 'rpc/cgh_save_deliverable')?.body.p_id === 'd1', 'deliverable edit sends rpc')
    await page.getByTestId('new-deliv').fill('תוצר חדש')
    await page.getByTestId('add-deliv').click()
    await page.waitForFunction(() => document.querySelectorAll('.deliv-edit').length >= 4)
    ok(last(log, 'POST', 'rpc/cgh_save_deliverable')?.body.p_id === null, 'add deliverable sends rpc')
    await page.getByTestId('edit-toggle').click()
    ok(await page.locator('h1').innerText() === 'מיפוי התהליך בשטח', 'edited title shown')
    ok(errors.length === 0, `no console errors ${errors.join(' | ')}`)
    await context.close()
  }

  console.log('Mobile')
  for (const role of [null, 'participant', 'mentor']) {
    const { page, context } = await newPage(browser, { role, viewport: { width: 375, height: 800 } })
    const paths = role === 'mentor' ? ['/', '/mentor', '/mentor/group', '/stage/1'] : role ? ['/', '/anchor', '/stage/0', '/stage/3'] : ['/', '/stage/3', '/example', '/example?s=5', '/example?e=binui&s=5', '/example?e=binui&s=1']
    for (const p of paths) {
      await page.goto(BASE + p)
      await page.waitForTimeout(900)
      await noHorizontalScroll(page, `${role || 'anon'} ${p}`)
    }
    await page.goto(BASE + '/')
    await page.waitForTimeout(900)
    await openMenu(page)
    ok(await page.locator('.panel-nav .navlink').count() >= 1, `${role || 'anon'} nav links inside the logo panel on mobile`)
    await page.locator('#owner-panel [data-testid="copy-link"]').click()
    await noHorizontalScroll(page, `${role || 'anon'} panel open`)
    await page.screenshot({ path: `tests/shots/mobile-${role || 'anon'}.png`, fullPage: true })
    if (!role) { await page.goto(BASE + '/example?s=1'); await page.waitForTimeout(1200); await page.screenshot({ path: 'tests/shots/mobile-example.png' }) }
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
