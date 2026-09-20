import type { demoData } from "./demo-data";
import type { LanguageCode } from "./interface-language";

type SpendingCategory = (typeof demoData.spending)[number]["name"];
export type OverviewCopy = {
  skipDashboard: string;
  skipDining: string;
  mainNavigation: string;
  walletOverview: string;
  encouragement: string;
  birdAlt: string;
  photoCredit: string;
  student: string;
  month: string;
  milestoneLabel: string;
  milestone: string;
  seeProgress: string;
  spendingEyebrow: string;
  spendingTitle: string;
  totalSpent: string;
  thisMonth: string;
  categories: Record<SpendingCategory, string>;
  remainingBudget: string;
  overBudget: string;
  diningTitle: string;
  diningLink: string;
  diningPhotoAlt: string;
  footer: string;
};

// Copy for the fixed September demo. {amount} keeps full sentences translatable
// while letting the UI emphasize the unchanged USD value in any word order.
export const overviewTranslations: Record<LanguageCode, OverviewCopy> = {
  en: {
    skipDashboard: "Skip to dashboard", skipDining: "Skip to dining planner", mainNavigation: "Main navigation", walletOverview: "Hokie Wallet overview",
    encouragement: "You’ve got this, Hokie!", birdAlt: "The HokieBird cheering at Lane Stadium", photoCredit: "Photo: Virginia Tech", student: "Hokie student",
    month: "September", milestoneLabel: "Sample savings milestone", milestone: "{amount} saved toward your emergency fund.", seeProgress: "See your progress",
    spendingEyebrow: "THE BIG PICTURE", spendingTitle: "A month in spending", totalSpent: "Total spent", thisMonth: "this month",
    categories: { "Food & coffee": "Food & coffee", Shopping: "Shopping", Transportation: "Transportation" },
    remainingBudget: "You have {amount} left in your budget.", overBudget: "You are {amount} over your budget.",
    diningTitle: "Plan your campus meals", diningLink: "Open dining planner", diningPhotoAlt: "Origami dining venue inside Turner Place at Virginia Tech", footer: "Built by Hokies · VTHacks 14",
  },
  zh: {
    skipDashboard: "跳转到仪表板", skipDining: "跳转到餐饮规划", mainNavigation: "主导航", walletOverview: "Hokie Wallet 概览",
    encouragement: "你能做到，Hokie！", birdAlt: "HokieBird 在 Lane Stadium 欢呼", photoCredit: "摄影：Virginia Tech", student: "Hokie 学生",
    month: "九月", milestoneLabel: "示例储蓄进度", milestone: "已为应急基金存下 {amount}。", seeProgress: "查看储蓄进度",
    spendingEyebrow: "总体概览", spendingTitle: "月度支出", totalSpent: "总支出", thisMonth: "本月",
    categories: { "Food & coffee": "餐饮与咖啡", Shopping: "购物", Transportation: "交通" },
    remainingBudget: "你的预算还剩 {amount}。", overBudget: "你已超出预算 {amount}。",
    diningTitle: "规划校园用餐", diningLink: "打开餐饮规划", diningPhotoAlt: "Virginia Tech 的 Turner Place 内的 Origami 餐厅", footer: "由 Hokies 打造 · VTHacks 14",
  },
  hi: {
    skipDashboard: "डैशबोर्ड पर जाएँ", skipDining: "भोजन योजनाकार पर जाएँ", mainNavigation: "मुख्य नेविगेशन", walletOverview: "Hokie Wallet का अवलोकन",
    encouragement: "तुम कर सकते हो, Hokie!", birdAlt: "Lane Stadium में उत्साह बढ़ाता HokieBird", photoCredit: "फ़ोटो: Virginia Tech", student: "Hokie छात्र",
    month: "सितंबर", milestoneLabel: "नमूना बचत प्रगति", milestone: "आपातकालीन निधि के लिए {amount} बचाए गए।", seeProgress: "अपनी प्रगति देखें",
    spendingEyebrow: "पूरी तस्वीर", spendingTitle: "एक महीने का खर्च", totalSpent: "कुल खर्च", thisMonth: "इस महीने",
    categories: { "Food & coffee": "खाना और कॉफ़ी", Shopping: "खरीदारी", Transportation: "परिवहन" },
    remainingBudget: "आपके बजट में {amount} बाकी हैं।", overBudget: "आपने बजट से {amount} अधिक खर्च किए हैं।",
    diningTitle: "कैंपस में भोजन की योजना बनाएँ", diningLink: "भोजन योजनाकार खोलें", diningPhotoAlt: "Virginia Tech के Turner Place में Origami भोजन स्थल", footer: "Hokies द्वारा निर्मित · VTHacks 14",
  },
  es: {
    skipDashboard: "Saltar al panel", skipDining: "Saltar al planificador de comidas", mainNavigation: "Navegación principal", walletOverview: "Resumen de Hokie Wallet",
    encouragement: "¡Tú puedes, Hokie!", birdAlt: "HokieBird animando en Lane Stadium", photoCredit: "Foto: Virginia Tech", student: "Estudiante Hokie",
    month: "Septiembre", milestoneLabel: "Progreso de ahorro de muestra", milestone: "{amount} ahorrados para tu fondo de emergencia.", seeProgress: "Ver tu progreso",
    spendingEyebrow: "VISTA GENERAL", spendingTitle: "Un mes de gastos", totalSpent: "Total gastado", thisMonth: "este mes",
    categories: { "Food & coffee": "Comida y café", Shopping: "Compras", Transportation: "Transporte" },
    remainingBudget: "Te quedan {amount} en tu presupuesto.", overBudget: "Has superado tu presupuesto en {amount}.",
    diningTitle: "Planifica tus comidas en el campus", diningLink: "Abrir planificador de comidas", diningPhotoAlt: "Restaurante Origami dentro de Turner Place en Virginia Tech", footer: "Creado por Hokies · VTHacks 14",
  },
  ar: {
    skipDashboard: "الانتقال إلى لوحة المعلومات", skipDining: "الانتقال إلى مخطط الوجبات", mainNavigation: "التنقل الرئيسي", walletOverview: "نظرة عامة على Hokie Wallet",
    encouragement: "أنت قدّها، Hokie!", birdAlt: "HokieBird يشجع في ملعب Lane Stadium", photoCredit: "الصورة: Virginia Tech", student: "طالب Hokie",
    month: "سبتمبر", milestoneLabel: "تقدم ادخار تجريبي", milestone: "تم ادخار {amount} لصندوق الطوارئ.", seeProgress: "شاهد تقدمك",
    spendingEyebrow: "الصورة العامة", spendingTitle: "الإنفاق خلال الشهر", totalSpent: "إجمالي الإنفاق", thisMonth: "هذا الشهر",
    categories: { "Food & coffee": "الطعام والقهوة", Shopping: "التسوق", Transportation: "المواصلات" },
    remainingBudget: "تبقى لديك {amount} في ميزانيتك.", overBudget: "تجاوزت ميزانيتك بمقدار {amount}.",
    diningTitle: "خطط لوجباتك في الحرم الجامعي", diningLink: "افتح مخطط الوجبات", diningPhotoAlt: "مطعم Origami داخل Turner Place في Virginia Tech", footer: "من صنع Hokies · VTHacks 14",
  },
  fr: {
    skipDashboard: "Aller au tableau de bord", skipDining: "Aller au planificateur de repas", mainNavigation: "Navigation principale", walletOverview: "Aperçu de Hokie Wallet",
    encouragement: "Tu peux le faire, Hokie !", birdAlt: "HokieBird encourage les supporters au Lane Stadium", photoCredit: "Photo : Virginia Tech", student: "Étudiant Hokie",
    month: "Septembre", milestoneLabel: "Progression d’épargne fictive", milestone: "{amount} épargnés pour votre fonds d’urgence.", seeProgress: "Voir votre progression",
    spendingEyebrow: "VUE D’ENSEMBLE", spendingTitle: "Un mois de dépenses", totalSpent: "Total dépensé", thisMonth: "ce mois-ci",
    categories: { "Food & coffee": "Repas et café", Shopping: "Achats", Transportation: "Transports" },
    remainingBudget: "Il vous reste {amount} dans votre budget.", overBudget: "Vous avez dépassé votre budget de {amount}.",
    diningTitle: "Planifiez vos repas sur le campus", diningLink: "Ouvrir le planificateur de repas", diningPhotoAlt: "Restaurant Origami dans Turner Place à Virginia Tech", footer: "Créé par des Hokies · VTHacks 14",
  },
  bn: {
    skipDashboard: "ড্যাশবোর্ডে যান", skipDining: "খাবার পরিকল্পনায় যান", mainNavigation: "প্রধান নেভিগেশন", walletOverview: "Hokie Wallet-এর সারসংক্ষেপ",
    encouragement: "তুমি পারবে, Hokie!", birdAlt: "Lane Stadium-এ উৎসাহ দিচ্ছে HokieBird", photoCredit: "ছবি: Virginia Tech", student: "Hokie শিক্ষার্থী",
    month: "সেপ্টেম্বর", milestoneLabel: "নমুনা সঞ্চয়ের অগ্রগতি", milestone: "আপনার জরুরি তহবিলের জন্য {amount} সঞ্চয় হয়েছে।", seeProgress: "আপনার অগ্রগতি দেখুন",
    spendingEyebrow: "সামগ্রিক চিত্র", spendingTitle: "এক মাসের খরচ", totalSpent: "মোট খরচ", thisMonth: "এই মাসে",
    categories: { "Food & coffee": "খাবার ও কফি", Shopping: "কেনাকাটা", Transportation: "যাতায়াত" },
    remainingBudget: "আপনার বাজেটে {amount} বাকি আছে।", overBudget: "আপনি বাজেটের চেয়ে {amount} বেশি খরচ করেছেন।",
    diningTitle: "ক্যাম্পাসে খাবারের পরিকল্পনা করুন", diningLink: "খাবার পরিকল্পনাকারী খুলুন", diningPhotoAlt: "Virginia Tech-এর Turner Place-এর ভেতরে Origami খাবারের স্থান", footer: "Hokies-এর তৈরি · VTHacks 14",
  },
  pt: {
    skipDashboard: "Ir para o painel", skipDining: "Ir para o planejador de refeições", mainNavigation: "Navegação principal", walletOverview: "Visão geral do Hokie Wallet",
    encouragement: "Você consegue, Hokie!", birdAlt: "HokieBird torcendo no Lane Stadium", photoCredit: "Foto: Virginia Tech", student: "Estudante Hokie",
    month: "Setembro", milestoneLabel: "Progresso de economia de exemplo", milestone: "{amount} guardados para sua reserva de emergência.", seeProgress: "Veja seu progresso",
    spendingEyebrow: "VISÃO GERAL", spendingTitle: "Um mês de gastos", totalSpent: "Total gasto", thisMonth: "neste mês",
    categories: { "Food & coffee": "Alimentação e café", Shopping: "Compras", Transportation: "Transporte" },
    remainingBudget: "Você ainda tem {amount} no seu orçamento.", overBudget: "Você ultrapassou seu orçamento em {amount}.",
    diningTitle: "Planeje suas refeições no campus", diningLink: "Abrir planejador de refeições", diningPhotoAlt: "Restaurante Origami dentro do Turner Place na Virginia Tech", footer: "Criado por Hokies · VTHacks 14",
  },
  ru: {
    skipDashboard: "Перейти к панели", skipDining: "Перейти к плану питания", mainNavigation: "Главная навигация", walletOverview: "Обзор Hokie Wallet",
    encouragement: "У тебя всё получится, Hokie!", birdAlt: "HokieBird поддерживает команду на Lane Stadium", photoCredit: "Фото: Virginia Tech", student: "Студент Hokie",
    month: "Сентябрь", milestoneLabel: "Пример прогресса накоплений", milestone: "Накоплено {amount} в ваш резервный фонд.", seeProgress: "Посмотреть прогресс",
    spendingEyebrow: "ОБЩАЯ КАРТИНА", spendingTitle: "Расходы за месяц", totalSpent: "Всего потрачено", thisMonth: "за этот месяц",
    categories: { "Food & coffee": "Еда и кофе", Shopping: "Покупки", Transportation: "Транспорт" },
    remainingBudget: "В вашем бюджете осталось {amount}.", overBudget: "Вы превысили бюджет на {amount}.",
    diningTitle: "Планируйте питание в кампусе", diningLink: "Открыть план питания", diningPhotoAlt: "Ресторан Origami в Turner Place университета Virginia Tech", footer: "Создано Hokies · VTHacks 14",
  },
  ur: {
    skipDashboard: "ڈیش بورڈ پر جائیں", skipDining: "کھانے کے منصوبہ ساز پر جائیں", mainNavigation: "مرکزی نیویگیشن", walletOverview: "Hokie Wallet کا جائزہ",
    encouragement: "تم کر سکتے ہو، Hokie!", birdAlt: "Lane Stadium میں حوصلہ بڑھاتا ہوا HokieBird", photoCredit: "تصویر: Virginia Tech", student: "Hokie طالب علم",
    month: "ستمبر", milestoneLabel: "بچت کی نمونہ پیش رفت", milestone: "آپ کے ہنگامی فنڈ کے لیے {amount} بچائے گئے۔", seeProgress: "اپنی پیش رفت دیکھیں",
    spendingEyebrow: "مجموعی تصویر", spendingTitle: "ایک ماہ کے اخراجات", totalSpent: "کل خرچ", thisMonth: "اس ماہ",
    categories: { "Food & coffee": "کھانا اور کافی", Shopping: "خریداری", Transportation: "آمدورفت" },
    remainingBudget: "آپ کے بجٹ میں {amount} باقی ہیں۔", overBudget: "آپ نے بجٹ سے {amount} زیادہ خرچ کیے ہیں۔",
    diningTitle: "کیمپس میں اپنے کھانوں کی منصوبہ بندی کریں", diningLink: "کھانے کا منصوبہ ساز کھولیں", diningPhotoAlt: "Virginia Tech کے Turner Place میں Origami کھانے کی جگہ", footer: "Hokies کا بنایا ہوا · VTHacks 14",
  },
};
