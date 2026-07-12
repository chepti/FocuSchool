import type {
  ClassSchedule,
  School,
  SchoolEvent,
  StaffMember,
  Strip,
} from "./types";

// בית ספר דמו — בהמשך הנתונים יגיעו מ-Firestore לפי schoolId

export const demoSchool: School = {
  id: "demo",
  name: "בית ספר אופק",
  description:
    "אתר בית הספר אופק — עדכונים, תמונות, דף קשר שבועי, לוח אירועים וכל מה שקורה אצלנו. מופעל על ידי פוקוסקול.",
  city: "תל אביב",
};

export const demoStrips: Strip[] = [
  {
    id: "posts",
    type: "posts",
    title: "מה היה לנו",
    order: 1,
    visible: true,
    items: [
      {
        id: "p1",
        status: "published",
        title: "יום המדע הבית ספרי",
        body: "התלמידים בנו רובוטים, שיגרו טילי חומץ וסודה וגילו שמדע זה הדבר הכי כיף שיש.",
        emoji: "🔬",
        gradient: "from-brand-purple to-brand-blue",
        date: "2026-07-05",
      },
      {
        id: "p2",
        status: "published",
        title: "טקס סיום שנה לשכבת ו׳",
        body: "ריגשתם אותנו! תודה לכל ההורים שהגיעו, ובהצלחה ענקית לבוגרים שלנו בחטיבה.",
        emoji: "🎓",
        gradient: "from-brand-pink to-brand-purple",
        date: "2026-06-30",
      },
      {
        id: "p3",
        status: "published",
        title: "שוק קח-תן קהילתי",
        body: "מאות ספרים, משחקים ובגדים החליפו ידיים. הכנסות הדוכן נתרמו לבית החולים.",
        emoji: "🛍️",
        gradient: "from-brand-blue to-brand-violet",
        date: "2026-06-18",
      },
      {
        id: "p4",
        status: "published",
        title: "ביקור סופרת בשכבת ב׳",
        body: "הסופרת נועה כהן סיפרה איך נולד ספר, וענתה על שאלות (בעיקר: כמה מרוויחים?).",
        emoji: "📚",
        gradient: "from-brand-violet to-brand-pink",
        date: "2026-06-10",
      },
    ],
  },
  {
    id: "files",
    type: "files",
    title: "דפי קשר וקבצים",
    order: 2,
    visible: true,
    items: [
      {
        id: "f1",
        status: "published",
        title: "דף קשר שבועי — ז׳ בתמוז",
        url: "#",
        emoji: "📄",
        date: "2026-07-07",
      },
      {
        id: "f2",
        status: "published",
        title: "דף קשר שבועי — כ״ט בסיוון",
        url: "#",
        emoji: "📄",
        date: "2026-06-30",
      },
      {
        id: "f3",
        status: "published",
        title: "רשימת ציוד לקיץ",
        url: "#",
        emoji: "🎒",
        date: "2026-06-25",
      },
      {
        id: "f4",
        status: "published",
        title: "חוזר תשלומים תשפ״ז",
        url: "#",
        emoji: "🧾",
        date: "2026-06-20",
      },
    ],
  },
  {
    id: "photos",
    type: "photos",
    title: "רגעים מהשטח",
    order: 3,
    visible: true,
    items: [
      {
        id: "ph1",
        status: "published",
        title: "מסיבת סיום כיתות א׳",
        emoji: "🎈",
        gradient: "from-brand-pink to-brand-violet",
      },
      {
        id: "ph2",
        status: "published",
        title: "הצגת תיאטרון — שכבת ד׳",
        emoji: "🎭",
        gradient: "from-brand-purple to-brand-magenta",
      },
      {
        id: "ph3",
        status: "published",
        title: "טיול שנתי לגליל",
        emoji: "⛰️",
        gradient: "from-brand-blue to-brand-purple",
      },
      {
        id: "ph4",
        status: "published",
        title: "יום ספורט",
        emoji: "⚽",
        gradient: "from-brand-violet to-brand-blue",
      },
      {
        id: "ph5",
        status: "published",
        title: "גינה לימודית פורחת",
        emoji: "🌻",
        gradient: "from-brand-magenta to-brand-pink",
      },
    ],
  },
  {
    id: "links",
    type: "links",
    title: "קישורים שימושיים",
    order: 4,
    visible: true,
    items: [
      {
        id: "l1",
        status: "published",
        title: "פורטל הורים — משרד החינוך",
        url: "https://parents.education.gov.il",
        emoji: "🏛️",
      },
      {
        id: "l2",
        status: "published",
        title: "ספריית פיג׳מה",
        url: "https://www.pjisrael.org",
        emoji: "🌙",
      },
      {
        id: "l3",
        status: "published",
        title: "מרחב הלמידה הכיתתי",
        url: "#",
        emoji: "💻",
      },
      {
        id: "l4",
        status: "published",
        title: "טופס הצהרת בריאות",
        url: "#",
        emoji: "🩺",
      },
    ],
  },
];

// מערכות שעות לדוגמה — נזרעות ל-schedules/{classId}
export const demoSchedules: Record<string, ClassSchedule> = {
  ב2: {
    days: [
      {
        lessons: [
          { subject: "מפגש בוקר", teacher: "מיכל ברק" },
          { subject: "שפה", teacher: "מיכל ברק" },
          { subject: "חשבון", teacher: "מיכל ברק" },
          { subject: "אנגלית", teacher: "יעל שדה" },
          { subject: "אמנות", teacher: "נועה פרץ" },
        ],
      },
      {
        lessons: [
          { subject: "חשבון", teacher: "מיכל ברק" },
          { subject: "שפה", teacher: "מיכל ברק" },
          { subject: "חינוך גופני", teacher: "אבי כהן" },
          { subject: "מדעים", teacher: "רונית לוי" },
          { subject: "תורה", teacher: "מיכל ברק" },
        ],
      },
      {
        lessons: [
          { subject: "שפה", teacher: "מיכל ברק" },
          { subject: "חשבון", teacher: "מיכל ברק" },
          { subject: "מוזיקה", teacher: "עומר גל" },
          { subject: "אנגלית", teacher: "יעל שדה" },
          { subject: "כישורי חיים", teacher: "מיכל ברק" },
        ],
      },
      {
        lessons: [
          { subject: "מדעים", teacher: "רונית לוי" },
          { subject: "שפה", teacher: "מיכל ברק" },
          { subject: "חשבון", teacher: "מיכל ברק" },
          { subject: "ספרייה", teacher: "מיכל ברק" },
          { subject: "אמנות", teacher: "נועה פרץ" },
        ],
      },
      {
        lessons: [
          { subject: "חינוך גופני", teacher: "אבי כהן" },
          { subject: "חשבון", teacher: "מיכל ברק" },
          { subject: "שפה", teacher: "מיכל ברק" },
          { subject: "תורה", teacher: "מיכל ברק" },
        ],
      },
      {
        lessons: [
          { subject: "מפגש שבת", teacher: "מיכל ברק" },
          { subject: "שפה", teacher: "מיכל ברק" },
          { subject: "משחקי חשיבה", teacher: "מיכל ברק" },
        ],
      },
    ],
  },
};

// אלפון צוות לדוגמה — נזרע ל-staff/{staffId}
export const demoStaff: StaffMember[] = [
  {
    id: "s1",
    name: "מיכל ברק",
    subjects: ["מחנכת", "שפה", "חשבון"],
    classes: ["ב2"],
    email: "michal@ofek-demo.school",
  },
  {
    id: "s2",
    name: "יעל שדה",
    subjects: ["אנגלית"],
    classes: ["ב1", "ב2", "ג1"],
    email: "yael@ofek-demo.school",
  },
  {
    id: "s3",
    name: "אבי כהן",
    subjects: ["חינוך גופני"],
    classes: ["א1", "ב2", "ה1"],
    email: "avi@ofek-demo.school",
  },
  {
    id: "s4",
    name: "רונית לוי",
    subjects: ["מדעים"],
    classes: ["ב2", "ה1"],
    email: "ronit@ofek-demo.school",
    phone: "050-0000000",
  },
];

/** קישורי אלבום מוגנים לפריטי תמונות — נזרעים ל-items/{id}/private/parents */
export const demoPrivateAlbums: Record<string, string> = {
  ph1: "https://photos.google.com/",
};

export const demoEvents: SchoolEvent[] = [
  {
    id: "e1",
    title: "פתיחת שנת הלימודים תשפ״ז",
    date: "2026-09-01",
    grades: [],
    publicInfo: "שערי בית הספר נפתחים ב-08:00. מסיימים ב-11:45.",
  },
  {
    id: "e2",
    title: "אסיפת הורים — שכבות א׳-ג׳",
    date: "2026-09-08",
    grades: ["א", "ב", "ג"],
    publicInfo: "אסיפת הורים כיתתית בשעה 19:00 בכיתות.",
  },
  {
    id: "e3",
    title: "סליחות מתחת לכוכבים",
    date: "2026-09-14",
    grades: ["ה", "ו"],
    publicInfo: "ערב שירה וסליחות בחצר בית הספר, 20:30. ההורים מוזמנים.",
  },
  {
    id: "e4",
    title: "יום צילומי מחזור",
    date: "2026-09-17",
    grades: ["ו"],
    publicInfo: "מגיעים עם חולצת בית ספר לבנה.",
  },
];
