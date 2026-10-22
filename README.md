# הכשרה לבניית אפליקציות (Hachshara)

מסלול הכשרה לבניית פתרונות AI בתחום התרבות והעיר. שם הפרויקט בוורסל: cultura-gh.

מערכת ללימוד ומעקב אחרי מסלול הכשרה של 12 שבועות. המשתתף בונה פתרון AI אחד מקצה לקצה, עבור ארגון אמיתי מתחום התרבות או העירייה, לפי שיטת העבודה CORE.

## מסמכים

| קובץ | תוכן |
|---|---|
| docs/01-problem-and-user.md | הבעיה, המשתמשים, ההנחות |
| docs/02-user-flows.md | המסלולים המרכזיים במערכת |
| docs/03-data-model.md | המידע שנשמר והקשרים ביניו |
| docs/04-mvp-scope.md | מה נכנס למוצר המינימלי ומה לא |
| docs/05-claude-code-prompt.md | פרומפט הביצוע ל-Claude Code |

## מצב

גרסה ראשונה בנויה: Vite + React + framer-motion, Supabase (טבלאות cgh_ בפרויקט cultura-GH), כניסה עם Google.

- `npm run dev` לפיתוח, `npm run build` לבנייה.
- `npm test` מריץ בדיקת Playwright מול `vite preview` עם מוקים לכל קריאות Supabase (צריך `npm run build` קודם).

## החלטות מימוש

- משתתף נכנס עם Google ומשובץ אוטומטית למחזור הפתוח (פונקציה cgh_bootstrap). מנטור מוגדר לפי כתובת בטבלת cgh_mentors.
- נוסף סטטוס "submitted" לארגון העוגן, כדי שיופיע בתור הבדיקה.
- לשלבים נוספו השדות weeks ו-due_week לחישוב תאריך יעד מתאריך תחילת המחזור.
- שלבים ותוצרים קריאים גם בלי כניסה, כדי שדף הבית ימפה את המסלול.
- החלטות מנטור ומעבר שלב נעשים רק דרך פונקציות SQL (cgh_review_submission, cgh_review_anchor, cgh_advance_stage) שבודקות הרשאה ושלמות שלב.

## פריסה

- ריפו: https://github.com/Anat1969/Hachshara-GH
- פרויקט Vercel: CULTURA-GH
