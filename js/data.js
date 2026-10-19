/**
 * Radio Maria Nazareth - Schedule Builder Data
 * راديو مريم الناصرة - بيانات ومكتبة البرامج الافتراضية
 */

const RMN_DAYS = [
  { id: 'mon', nameAr: 'الاثنين', nameEn: 'Monday', shortAr: 'ن', order: 1 },
  { id: 'tue', nameAr: 'الثلاثاء', nameEn: 'Tuesday', shortAr: 'ث', order: 2 },
  { id: 'wed', nameAr: 'الأربعاء', nameEn: 'Wednesday', shortAr: 'ر', order: 3 },
  { id: 'thu', nameAr: 'الخميس', nameEn: 'Thursday', shortAr: 'خ', order: 4 },
  { id: 'fri', nameAr: 'الجمعة', nameEn: 'Friday', shortAr: 'ج', order: 5 },
  { id: 'sat', nameAr: 'السبت', nameEn: 'Saturday', shortAr: 'س', order: 6 },
  { id: 'sun', nameAr: 'الأحد', nameEn: 'Sunday', shortAr: 'ح', order: 7 },
];

const RMN_CATEGORIES = [
  { id: 'cate-00', alias: 'catechism', name: 'تعليم مسيحي', color: '#dc2626', bgLight: '#fef2f2', border: '#fca5a5', icon: 'book' },
  { id: 'cate-01', alias: 'culture_holy_land', name: 'تاريخ والأرض المقدسة', color: '#0891b2', bgLight: '#ecfeff', border: '#a5f3fc', icon: 'globe' },
  { id: 'cate-02', alias: 'hymns', name: 'ترانيم وموسيقى مقدسة', color: '#059669', bgLight: '#ecfdf5', border: '#6ee7b7', icon: 'music' },
  { id: 'cate-03', alias: 'jingles', name: 'فواصل وهوية المحطة', color: '#64748b', bgLight: '#f1f5f9', border: '#e2e8f0', icon: 'radio' },
  { id: 'cate-04', alias: 'mass', name: 'القداس الإلهي', color: '#b91c1c', bgLight: '#fef2f2', border: '#fca5a5', icon: 'cross' },
  { id: 'cate-05', alias: 'news', name: 'أخبار', color: '#475569', bgLight: '#f8fafc', border: '#cbd5e1', icon: 'newspaper' },
  { id: 'cate-06', alias: 'prayers', name: 'صلوات وليتورجيا', color: '#1d4ed8', bgLight: '#eff6ff', border: '#93c5fd', icon: 'book' },
  { id: 'cate-07', alias: 'rosary', name: 'المسبحة الوردية', color: '#0284c7', bgLight: '#f0f9ff', border: '#7dd3fc', icon: 'book' },
  { id: 'cate-08', alias: 'saints', name: 'قديسون', color: '#ea580c', bgLight: '#fff7ed', border: '#fdba74', icon: 'sparkles' },
  { id: 'cate-09', alias: 'spiritual', name: 'برامج روحية ولاهوتية', color: '#7c3aed', bgLight: '#f5f3ff', border: '#c4b5fd', icon: 'sparkles' },
  { id: 'cate-10', alias: 'youth_family', name: 'شبيبة وعائلة', color: '#d97706', bgLight: '#fffbeb', border: '#fde68a', icon: 'users' }
];

// 60 Curated, Distinct, High-Contrast Colors for Program Palette (Far From Each Other, No Duplicates)
const RMN_60_COLORS = [
  '#dc2626', '#1d4ed8', '#16a34a', '#ea580c', '#7c3aed', '#0d9488',
  '#e11d48', '#2563eb', '#059669', '#d97706', '#9333ea', '#0891b2',
  '#991b1b', '#1e40af', '#15803d', '#c05621', '#6d28d9', '#0f766e',
  '#be123c', '#3b82f6', '#65a30d', '#ca8a04', '#c026d3', '#0284c7',
  '#b91c1c', '#1e3a8a', '#14532d', '#b45309', '#581c87', '#115e59',
  '#f43f5e', '#4f46e5', '#047857', '#a16207', '#a21caf', '#0e7490',
  '#7f1d1d', '#3730a3', '#4d7c0f', '#854d0e', '#7e22ce', '#155e75',
  '#881337', '#4338ca', '#065f46', '#78350f', '#701a75', '#0369a1',
  '#9f1239', '#312e81', '#3f6212', '#9a3412', '#3b0764', '#075985',
  '#c2410c', '#6366f1', '#22c55e', '#7c2d12', '#475569', '#0c4a6e'
];
const RMN_50_COLORS = RMN_60_COLORS;

const RMN_PROGRAM_LIBRARY_VERSION = 2;

const LEGACY_DEFAULT_PROGRAMS = [
  {
    id: 'prog-mass-annunciation',
    title: 'القداس الإلهي المباشر - بازيليك البشارة',
    categoryId: 'mass',
    defaultDuration: 60, // 60 minutes = 12 slots
    presenter: 'كهنة رعية البشارة بالناصرة',
    color: '#b91c1c', // 1
    description: 'بث حي ومباشر للذبيحة الإلهية اليومية من مغارة البشارة بالناصرة.',
    fixed: true
  },
  {
    id: 'prog-rosary-morning',
    title: 'صلاة الوردية المقدسة الصباحية',
    categoryId: 'prayers',
    defaultDuration: 30, // 6 slots
    presenter: 'عائلة راديو مريم',
    color: '#1d4ed8', // 2
    description: 'تلاوة أسرار الوردية المقدسة مع تأملات روحية وطلبات المستمعين.',
    fixed: true
  },
  {
    id: 'prog-angelus',
    title: 'صلاة التبشير الملائكي (صلاة الظهيرة)',
    categoryId: 'prayers',
    defaultDuration: 15, // 3 slots
    presenter: 'أثير راديو مريم',
    color: '#2563eb', // 3
    description: 'ملاك الرب بشّر مريم العذراء، صلاة منتصف النهار اليومية.',
    fixed: true
  },
  {
    id: 'prog-divine-mercy',
    title: 'مسبحة الرحمة الإلهية (الساعة الثالثة)',
    categoryId: 'prayers',
    defaultDuration: 30, // 6 slots
    presenter: 'جماعة الرحمة الإلهية',
    color: '#9333ea', // 4
    description: 'صلاة ساعة النعمة ومسبحة الرحمة الإلهية وترانيم خشوعية.',
    fixed: true
  },
  {
    id: 'prog-morning-prayer',
    title: 'صلاة السحر والمزامير',
    categoryId: 'prayers',
    defaultDuration: 30,
    presenter: 'خدمة الصلوات اليومية',
    color: '#1e40af', // 5
    description: 'افتتاح البث الصباحي بالمزامير والتراتيل الطقسية الشرقية والغربية.',
    fixed: true
  },
  {
    id: 'prog-vespers',
    title: 'صلاة الغروب وتسبحة المساء',
    categoryId: 'prayers',
    defaultDuration: 30,
    presenter: 'جوقة المحطة',
    color: '#4f46e5', // 6
    description: 'صلاة المساء الكنسية وطلبات ختام النهار وشكر النعمة.',
    fixed: true
  },
  {
    id: 'prog-compline',
    title: 'صلاة النوم وبركة المساء الختامية',
    categoryId: 'prayers',
    defaultDuration: 30,
    presenter: 'كهنة ومكرسي المحطة',
    color: '#3730a3', // 7
    description: 'خاتمة البث الحي وتأمل قبل الراحة الليلية مع بركة الكاهن.',
    fixed: true
  },
  {
    id: 'prog-gospel-reflection',
    title: 'تأملات في إنجيل اليوم وعظة اليوم',
    categoryId: 'spiritual',
    defaultDuration: 30,
    presenter: 'أحد الآباء الروحيين',
    color: '#7c3aed', // 8
    description: 'شرح لاهوتي وروحي لنصوص قراءات اليوم الطقسية المعاشة.',
    fixed: false
  },
  {
    id: 'prog-vatican-news',
    title: 'أخبار الفاتيكان والكنيسة الجامعة',
    categoryId: 'news',
    defaultDuration: 30,
    presenter: 'قسم الأخبار الإذاعي',
    color: '#475569', // 9
    description: 'موجز يومي لأخبار قداسة البابا ونشاطات الكنيسة في الشرق والعالم.',
    fixed: false
  },
  {
    id: 'prog-marian-hymns',
    title: 'باقة ترانيم مريمية ومختارات كنسية',
    categoryId: 'hymns',
    defaultDuration: 60,
    presenter: 'المكتبة الموسيقية',
    color: '#059669', // 10
    description: 'أجمل الترانيم المارونية، البيزنطية، واللاتينية المعزوفة والمرتلة.',
    fixed: false
  },
  {
    id: 'prog-holy-land-voice',
    title: 'صوت الأرض المقدسة وتاريخها',
    categoryId: 'culture_holy_land',
    defaultDuration: 60,
    presenter: 'مرشد سياحي ولاهوتي',
    color: '#0891b2', // 11
    description: 'رحلة أسبوعية مع كنائس الجليل، القدس، بيت لحم، والناصرة وتاريخها الحي.',
    fixed: false
  },
  {
    id: 'prog-youth-pulse',
    title: 'نبض الشبيبة ورجاء الغد',
    categoryId: 'youth_family',
    defaultDuration: 60,
    presenter: 'فريق شبيبة راديو مريم',
    color: '#ea580c', // 12
    description: 'برنامج حواري تفاعلي يناقش تحديات الشباب المسيحي والإيمان المعاش.',
    fixed: false
  },
  {
    id: 'prog-family-hour',
    title: 'ساعة مع العائلة وكنيستها البيتية',
    categoryId: 'youth_family',
    defaultDuration: 60,
    presenter: 'مرشد عائلي واستشاري',
    color: '#d97706', // 13
    description: 'توجيهات روحية وتربوية للحفاظ على دفء وتماسك الأسرة المسيحية.',
    fixed: false
  },
  {
    id: 'prog-catechism',
    title: 'تعليم الكنيسة الكاثوليكية وإيماننا',
    categoryId: 'spiritual',
    defaultDuration: 60,
    presenter: 'أستاذ اللاهوت العقائدي',
    color: '#6d28d9', // 14
    description: 'دراسة مبسطة وعميقة في بنود قانون الإيمان والأسرار المقدسة.',
    fixed: false
  },
  {
    id: 'prog-evening-rosary',
    title: 'الوردية العائلية المشتركة ونوايا المرضى',
    categoryId: 'prayers',
    defaultDuration: 30,
    presenter: 'عائلات ومستمعين في الاستوديو',
    color: '#0284c7', // 15
    description: 'مشاركة حية من العائلات مع تلاوة الصلوات على نية المتألمين والمتصلين.',
    fixed: true
  },
  {
    id: 'prog-night-whispers',
    title: 'سكون الليل وتراتيل تسبيح هادئة',
    categoryId: 'hymns',
    defaultDuration: 60,
    presenter: 'الأرشيف الموسيقي الهادئ',
    color: '#047857', // 16
    description: 'موسيقى وتأملات صامتة لمرافقة أوقات الراحة والسهر مع الرب.',
    fixed: false
  },
  {
    id: 'prog-station-id',
    title: 'فاصل نغمي وهوية راديو مريم',
    categoryId: 'jingles',
    defaultDuration: 5,
    presenter: 'صوت المحطة',
    color: '#334155', // 17
    description: 'نغمة المحطة، ترددات البث، وأرقام التواصل مع إذاعة العذراء بالناصرة.',
    fixed: false
  }
];

// برنامج المكتبة المعتمد: مستخرج من خريطة البث، دون أسماء مكررة.
const DEFAULT_PROGRAMS = [
  ['السلام الملائكي', 'prayers', 15],
  ['المسبحة الوردية لأسرار الحزن', 'prayers', 30],
  ['ترانيم', 'hymns', 30],
  ['غذاء الروح مع الأب سهيل خوري', 'spiritual', 30],
  ['تأملات مسيحية مع الأب جاني طعونس', 'spiritual', 30],
  ['نقطة حب من قلب الرب', 'spiritual', 15],
  ['الألحان البيزنطية مع المرتل أنور سعد', 'hymns', 30],
  ['إعادة كلمة حياة', 'spiritual', 30],
  ['Jingles + ترانيم', 'jingles', 5],
  ['التعليم المسيحي مع الأب رامز المحلّي', 'spiritual', 30],
  ['الليتورجية البيزنطية', 'prayers', 60],
  ['المطران بطرس المعلم', 'spiritual', 30],
  ['حياة الروح مع الأب سهيل خوري', 'spiritual', 30],
  ['لقاء الأحد مع الأخت ميسيا خوري', 'youth_family', 30],
  ['سفر الرؤيا', 'spiritual', 30],
  ['نغمات مسيحية مع الأب جاني طعونس', 'hymns', 30],
  ['نشيد الرحمة الإلهية', 'prayers', 15],
  ['آية اليوم + ترانيم', 'jingles', 15],
  ['نور المعرفة (الأب رامي جبر المحامي)', 'spiritual', 30],
  ['شموع محرقة مع الراهب لويفينا جادة', 'spiritual', 30],
  ['يوم التبشير', 'culture_holy_land', 30],
  ['هل تعرف', 'culture_holy_land', 15],
  ['الليتورجية في حياة المطران موسى الحاج', 'spiritual', 30],
  ['إشارة وبشارة — الأب سهيل خوري', 'spiritual', 30],
  ['قراءات روحية من الكتاب المقدس', 'spiritual', 30],
  ['رحلة الدخول إلى قلب المسيح مع الأب ميشيل نعمه', 'spiritual', 30],
  ['مع الأب مروان نعمان', 'spiritual', 30],
  ['تذكّر لزم الأب بشارة / خاطرة الأحد', 'spiritual', 15],
  ['رحلة النور مع الراهب ميرا كسكري', 'spiritual', 30],
  ['مع كنيسة المغارة للأخوة في الناصرة', 'culture_holy_land', 30],
  ['الاشتياق مع الراهب جوفانا عيد', 'spiritual', 30],
  ['مع الأب فرنسوا ابن ماري', 'spiritual', 30],
  ['كلمة ربّي نور لسبيلي', 'spiritual', 15],
  ['كنيسة المغارة للأخوة في الناصرة', 'culture_holy_land', 30],
  ['دور المعرفة (الأب رامي جبر المحامي)', 'spiritual', 30]
].map(([title, categoryId, defaultDuration], index) => ({
  id: `rmn-program-${index + 1}`,
  title,
  categoryId,
  defaultDuration,
  presenter: 'راديو مريم الناصرة',
  color: RMN_50_COLORS[index],
  description: '',
  fixed: categoryId === 'prayers'
}));

// Standard Recurring Schedule Blueprint
const LEGACY_DEFAULT_WEEKLY_BLUEPRINT = [
  // 00:00 - 06:00: Night calm hymns
  { start: '00:00', end: '06:00', programId: 'prog-night-whispers', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 06:00 - 06:30: Morning Prayer
  { start: '06:00', end: '06:30', programId: 'prog-morning-prayer', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 06:30 - 07:00: Hymns
  { start: '06:30', end: '07:00', programId: 'prog-marian-hymns', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 07:00 - 07:30: Morning Rosary
  { start: '07:00', end: '07:30', programId: 'prog-rosary-morning', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 07:30 - 08:00: Gospel Reflection
  { start: '07:30', end: '08:00', programId: 'prog-gospel-reflection', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 08:00 - 09:00: Holy Mass from Annunciation Basilica
  { start: '08:00', end: '09:00', programId: 'prog-mass-annunciation', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 09:00 - 10:00: Hymns
  { start: '09:00', end: '10:00', programId: 'prog-marian-hymns', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 10:00 - 11:00: Catechism / Holy Land Voice
  { start: '10:00', end: '11:00', programId: 'prog-catechism', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { start: '10:00', end: '11:00', programId: 'prog-holy-land-voice', days: ['sat', 'sun'] },
  // 11:00 - 12:00: Talk Show / Family Hour
  { start: '11:00', end: '12:00', programId: 'prog-holy-land-voice', days: ['mon', 'wed', 'fri'] },
  { start: '11:00', end: '12:00', programId: 'prog-family-hour', days: ['tue', 'thu', 'sat', 'sun'] },
  // 12:00 - 12:15: Angelus
  { start: '12:00', end: '12:15', programId: 'prog-angelus', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 12:15 - 13:00: Marian Hymns
  { start: '12:15', end: '13:00', programId: 'prog-marian-hymns', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 13:00 - 13:30: Vatican News
  { start: '13:00', end: '13:30', programId: 'prog-vatican-news', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 13:30 - 15:00: Music & Reflections
  { start: '13:30', end: '15:00', programId: 'prog-marian-hymns', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 15:00 - 15:30: Divine Mercy
  { start: '15:00', end: '15:30', programId: 'prog-divine-mercy', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 15:30 - 17:00: Youth Pulse / Family
  { start: '15:30', end: '17:00', programId: 'prog-youth-pulse', days: ['mon', 'wed', 'fri', 'sun'] },
  { start: '15:30', end: '17:00', programId: 'prog-family-hour', days: ['tue', 'thu', 'sat'] },
  // 17:00 - 18:00: Hymns
  { start: '17:00', end: '18:00', programId: 'prog-marian-hymns', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 18:00 - 18:30: Vespers
  { start: '18:00', end: '18:30', programId: 'prog-vespers', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 18:30 - 19:30: Catechism
  { start: '18:30', end: '19:30', programId: 'prog-catechism', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 19:30 - 20:30: Holy Land Voice
  { start: '19:30', end: '20:30', programId: 'prog-holy-land-voice', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 20:30 - 21:00: News
  { start: '20:30', end: '21:00', programId: 'prog-vatican-news', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 21:00 - 21:30: Evening Rosary
  { start: '21:00', end: '21:30', programId: 'prog-evening-rosary', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 21:30 - 22:00: Compline
  { start: '21:30', end: '22:00', programId: 'prog-compline', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  // 22:00 - 24:00: Night Whispers
  { start: '22:00', end: '24:00', programId: 'prog-night-whispers', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }
];

// يبدأ الجدول الجديد فارغاً ليبنيه مسؤول البرامج بحسب الموسم أو المناسبة.
const DEFAULT_WEEKLY_BLUEPRINT = [];
