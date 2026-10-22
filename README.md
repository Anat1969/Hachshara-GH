# הכשרה לבניית אפליקציות (Hachshara)

מסלול הכשרה לבניית פתרונות AI בתחום התרבות והעיר. שם הפרויקט בוורסל: hachsharaapp. כתובת: https://hachsharaapp.vercel.app

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

גרסה ראשונה בנויה: Vite + React + framer-motion, Supabase (טבלאות cgh_ בפרויקט cultura-GH), כניסה חופשית בלי התחברות.

- `npm run dev` לפיתוח, `npm run build` לבנייה.
- `npm test` מריץ בדיקת Playwright מול `vite preview` עם מוקים לכל קריאות Supabase (צריך `npm run build` קודם).

## החלטות מימוש

- כניסה חופשית: משתתף מקליד שם ומצטרף למחזור הפתוח (cgh_join), ומקבל קישור אישי לחזרה. מנטור נכנס בלחיצה.
- נוסף סטטוס "submitted" לארגון העוגן, כדי שיופיע בתור הבדיקה.
- לשלבים נוספו השדות weeks ו-due_week לחישוב תאריך יעד מתאריך תחילת המחזור.
- שלבים ותוצרים קריאים גם בלי כניסה, כדי שדף הבית ימפה את המסלול.
- כל כתיבה עוברת דרך פונקציות SQL (cgh_save_submission, cgh_save_anchor, cgh_review_*, cgh_advance_stage, cgh_save_stage, cgh_save_deliverable). מעבר שלב נבדק מול שלמות השלב.

## פריסה

- ריפו: https://github.com/Anat1969/Hachshara-GH
- פרויקט Vercel: hachsharaapp
