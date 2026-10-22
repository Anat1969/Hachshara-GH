# מודל מידע

המערכת שומרת ב-Supabase (PostgreSQL). כל הטבלאות עם קידומת `cgh_` כדי להפריד מפרויקטים אחרים באותו מסד.

## טבלאות

### cgh_profiles
- id (uuid, מפתח ראשי, מתאים ל-auth.users.id)
- display_name (text)
- role (text: "participant" או "mentor")
- created_at (timestamptz)

### cgh_cohorts
- id (uuid)
- name (text)
- starts_on (date)
- created_at (timestamptz)

### cgh_enrollments
- id (uuid)
- cohort_id (uuid, מפתח זר ל-cgh_cohorts)
- profile_id (uuid, מפתח זר ל-cgh_profiles)
- current_stage (int, 0 עד 7)
- anchor_org_id (uuid, מפתח זר ל-cgh_anchor_orgs, אפשר NULL עד שבוע 1)
- unique (cohort_id, profile_id)

### cgh_anchor_orgs
- id (uuid)
- enrollment_id (uuid, מפתח זר, unique)
- org_name (text)
- sector (text: "culture", "municipality", "other")
- contact_name (text)
- pain_points (jsonb, מערך של שלושה טקסטים)
- status (text: "draft", "approved", "returned")
- mentor_note (text, אפשר NULL)

### cgh_stages
- id (int, 0 עד 7)
- title (text)
- goal (text)
- sort_order (int)

### cgh_deliverables
- id (uuid)
- stage_id (int, מפתח זר ל-cgh_stages)
- title (text)
- description (text)
- sort_order (int)

### cgh_submissions
- id (uuid)
- enrollment_id (uuid, מפתח זר)
- deliverable_id (uuid, מפתח זר)
- content (text)
- link (text, אפשר NULL)
- status (text: "draft", "submitted", "approved", "returned")
- submitted_at (timestamptz, אפשר NULL)
- updated_at (timestamptz)
- unique (enrollment_id, deliverable_id)

### cgh_reviews
- id (uuid)
- submission_id (uuid, מפתח זר)
- mentor_id (uuid, מפתח זר ל-cgh_profiles)
- decision (text: "approved", "returned")
- note (text)
- created_at (timestamptz)

## הרשאות (RLS)

- משתתף קורא ומעדכן רק את ה-enrollment, הארגון והתוצרים שלו.
- משתתף לא רואה תוצרים של משתתפים אחרים.
- מנטור קורא את כל הרשומות בקוהורט שלו, וכותב רק ב-cgh_reviews ובשדה mentor_note.
- טבלת cgh_stages ו-cgh_deliverables קריאה לכל משתמש מחובר, כתיבה למנטור בלבד.

## כלל

שלב נחשב "הושלם" כאשר כל התוצרים שלו בסטטוס "approved". העלאת השלב הבא (current_stage) מתבצעת רק על ידי מנטור.
