export type LanguageCode = "en" | "zh" | "hi" | "es" | "ar" | "fr" | "bn" | "pt" | "ru" | "ur";

export const languageOptions: ReadonlyArray<{ code: LanguageCode; label: string; speechTag: string }> = [
  { code: "en", label: "English", speechTag: "en-US" },
  { code: "zh", label: "中文 (Mandarin)", speechTag: "zh-CN" },
  { code: "hi", label: "हिन्दी (Hindi)", speechTag: "hi-IN" },
  { code: "es", label: "Español (Spanish)", speechTag: "es-ES" },
  { code: "ar", label: "العربية (Arabic)", speechTag: "ar" },
  { code: "fr", label: "Français (French)", speechTag: "fr-FR" },
  { code: "bn", label: "বাংলা (Bengali)", speechTag: "bn-BD" },
  { code: "pt", label: "Português (Portuguese)", speechTag: "pt-BR" },
  { code: "ru", label: "Русский (Russian)", speechTag: "ru-RU" },
  { code: "ur", label: "اردو (Urdu)", speechTag: "ur-PK" },
];

type InterfaceCopy = {
  accessTools: string;
  personalize: string;
  accessibilityTools: string;
  closeAccessTools: string;
  textSize: string;
  standard: string;
  large: string;
  strongerContrast: string;
  contrastHelp: string;
  dashboardColors: string;
  motion: string;
  motionHelp: string;
  system: string;
  smooth: string;
  reduced: string;
  language: string;
  languageHelp: string;
  listen: string;
  stopReading: string;
  readingStatus: string;
  speechUnavailable: string;
  nav: Record<"main" | "activity" | "savings" | "finbot" | "dining", string>;
  views: Record<"main" | "activity" | "savings" | "finbot", { title: string; description: string }>;
  workspace: string;
  talkToFinbot: string;
  darkMode: string;
  lightMode: string;
  demoSample: string;
  plannerSample: string;
  diningKicker: string;
  diningTitle: string;
  diningDescription: string;
};

const english: InterfaceCopy = {
  accessTools: "Access tools",
  personalize: "MAKE IT YOURS",
  accessibilityTools: "Accessibility tools",
  closeAccessTools: "Close accessibility tools",
  textSize: "Text size",
  standard: "Standard",
  large: "Large",
  strongerContrast: "Stronger contrast",
  contrastHelp: "Sharpens text, borders, and focus without replacing your colors.",
  dashboardColors: "Dashboard colors",
  motion: "Motion",
  motionHelp: "System follows your device. Smooth adds transitions. Reduced switches instantly.",
  system: "System",
  smooth: "Smooth",
  reduced: "Reduced",
  language: "Language",
  languageHelp: "Translates navigation, headings, and access tools. Detailed demo content stays in English.",
  listen: "Listen to this view",
  stopReading: "Stop reading",
  readingStatus: "Reading this view aloud.",
  speechUnavailable: "Text-to-speech is not available in this browser.",
  nav: { main: "Overview", activity: "Activity", savings: "Savings", finbot: "FinBot", dining: "Dining" },
  views: {
    main: { title: "Your budget", description: "A clearer view of today. A little more confidence for tomorrow." },
    activity: { title: "Transactions", description: "A closer look at your latest sample purchases." },
    savings: { title: "Your savings", description: "Make space for your next chapter, one contribution at a time." },
    finbot: { title: "FinBot", description: "Explore your questions with a sample conversation." },
  },
  workspace: "My workspace",
  talkToFinbot: "Talk it through with FinBot",
  darkMode: "Dark mode",
  lightMode: "Light mode",
  demoSample: "Sample data",
  plannerSample: "Sample inputs",
  diningKicker: "VIRGINIA TECH DINING",
  diningTitle: "Make every meal & dollar count.",
  diningDescription: "Plan your week around your dining plan, class schedule, and campus balance.",
};

const translations: Record<Exclude<LanguageCode, "en">, Partial<InterfaceCopy>> = {
  zh: {
    accessTools: "辅助工具", personalize: "个性化设置", accessibilityTools: "无障碍工具", closeAccessTools: "关闭无障碍工具",
    textSize: "文字大小", standard: "标准", large: "大", strongerContrast: "增强对比度", contrastHelp: "增强文字、边框和焦点提示，同时保留所选配色。",
    dashboardColors: "仪表板配色", motion: "动效", motionHelp: "跟随系统设置，或选择流畅或减少动效。", system: "跟随系统", smooth: "流畅", reduced: "减少",
    language: "语言", languageHelp: "翻译导航、页面标题和辅助工具。详细演示内容仍为英语。", listen: "朗读此页面", stopReading: "停止朗读", readingStatus: "正在朗读此页面。", speechUnavailable: "此浏览器不支持文本朗读。",
    nav: { main: "概览", activity: "近期活动", savings: "储蓄目标", finbot: "询问 FinBot", dining: "餐饮规划" },
    views: { main: { title: "为重要的事留出空间。", description: "更清楚地了解今天，更自信地迎接明天。" }, activity: { title: "小支出也会累积。", description: "查看最近的示例消费。" }, savings: { title: "每天都更近一步。", description: "一次一点，为下一阶段做好准备。" }, finbot: { title: "聊聊钱吧。", description: "通过示例对话探索你的问题。" } },
    workspace: "我的工作区", talkToFinbot: "与 FinBot 聊一聊", darkMode: "深色模式", lightMode: "浅色模式", demoSample: "演示 · 示例数据", plannerSample: "规划器 · 示例输入",
    diningKicker: "校园餐饮与预算相结合", diningTitle: "让每一餐、每一元都物有所值。", diningDescription: "根据你的 Virginia Tech 餐饮计划、日程、偏好和校园余额，制定一学年的用餐节奏。",
  },
  hi: {
    accessTools: "सुलभता टूल", personalize: "अपने अनुसार बनाएँ", accessibilityTools: "सुलभता टूल", closeAccessTools: "सुलभता टूल बंद करें",
    textSize: "टेक्स्ट आकार", standard: "मानक", large: "बड़ा", strongerContrast: "अधिक कॉन्ट्रास्ट", contrastHelp: "रंग बदले बिना टेक्स्ट, बॉर्डर और फ़ोकस को अधिक स्पष्ट बनाता है।",
    dashboardColors: "डैशबोर्ड रंग", motion: "गति", motionHelp: "सिस्टम डिवाइस सेटिंग मानता है। स्मूद ट्रांज़िशन जोड़ता है और कम गति तुरंत बदलती है।", system: "सिस्टम", smooth: "स्मूद", reduced: "कम",
    language: "भाषा", languageHelp: "नेविगेशन, शीर्षक और सुलभता टूल का अनुवाद करता है। विस्तृत डेमो अंग्रेज़ी में रहता है।", listen: "यह दृश्य सुनें", stopReading: "पढ़ना रोकें", readingStatus: "यह दृश्य पढ़ा जा रहा है।", speechUnavailable: "इस ब्राउज़र में टेक्स्ट-टू-स्पीच उपलब्ध नहीं है।",
    nav: { main: "अवलोकन", activity: "हाल की गतिविधि", savings: "बचत लक्ष्य", finbot: "FinBot से पूछें", dining: "भोजन योजना" },
    views: { main: { title: "ज़रूरी चीज़ों के लिए जगह बनाएँ।", description: "आज की साफ़ तस्वीर। कल के लिए थोड़ा अधिक भरोसा।" }, activity: { title: "छोटी चीज़ें जुड़ती जाती हैं।", description: "अपनी हाल की नमूना खरीदारी को करीब से देखें।" }, savings: { title: "हर दिन थोड़ा और करीब।", description: "एक बार में एक योगदान से अगले अध्याय के लिए जगह बनाएँ।" }, finbot: { title: "पैसों की बात करें।", description: "एक नमूना बातचीत के साथ अपने सवाल जानें।" } },
    workspace: "मेरा कार्यक्षेत्र", talkToFinbot: "FinBot से बात करें", darkMode: "डार्क मोड", lightMode: "लाइट मोड", demoSample: "डेमो · नमूना डेटा", plannerSample: "योजनाकार · नमूना इनपुट",
    diningKicker: "कैंपस भोजन और आपका बजट", diningTitle: "हर भोजन और हर डॉलर को सार्थक बनाएँ।", diningDescription: "अपने Virginia Tech प्लान, समय, पसंद और कैंपस बैलेंस के अनुसार पूरे सत्र की भोजन योजना बनाएँ।",
  },
  es: {
    accessTools: "Accesibilidad", personalize: "HAZLO TUYO", accessibilityTools: "Herramientas de accesibilidad", closeAccessTools: "Cerrar herramientas de accesibilidad",
    textSize: "Tamaño del texto", standard: "Estándar", large: "Grande", strongerContrast: "Más contraste", contrastHelp: "Refuerza el texto, los bordes y el enfoque sin sustituir tus colores.",
    dashboardColors: "Colores del panel", motion: "Movimiento", motionHelp: "Sistema sigue tu dispositivo. Suave añade transiciones. Reducido cambia al instante.", system: "Sistema", smooth: "Suave", reduced: "Reducido",
    language: "Idioma", languageHelp: "Traduce la navegación, los títulos y las herramientas. El contenido detallado de demostración sigue en inglés.", listen: "Escuchar esta vista", stopReading: "Detener lectura", readingStatus: "Leyendo esta vista en voz alta.", speechUnavailable: "La lectura de texto no está disponible en este navegador.",
    nav: { main: "Resumen", activity: "Actividad reciente", savings: "Meta de ahorro", finbot: "Preguntar a FinBot", dining: "Planificador de comidas" },
    views: { main: { title: "Haz espacio para lo importante.", description: "Una visión más clara de hoy. Un poco más de confianza para mañana." }, activity: { title: "Los pequeños gastos se suman.", description: "Una mirada más cercana a tus compras de muestra recientes." }, savings: { title: "Un poco más cerca cada día.", description: "Prepárate para tu próxima etapa, una aportación a la vez." }, finbot: { title: "Hablemos de dinero.", description: "Explora tus preguntas con una conversación de muestra." } },
    workspace: "Mi espacio", talkToFinbot: "Hablar con FinBot", darkMode: "Modo oscuro", lightMode: "Modo claro", demoSample: "Demo · Datos de muestra", plannerSample: "Planificador · Datos de muestra",
    diningKicker: "COMEDOR UNIVERSITARIO Y TU PRESUPUESTO", diningTitle: "Haz que cada comida y cada dólar cuenten.", diningDescription: "Organiza tus comidas del curso según tu plan de Virginia Tech, horario, preferencias y saldos del campus.",
  },
  ar: {
    accessTools: "أدوات الوصول", personalize: "اجعلها تناسبك", accessibilityTools: "أدوات إمكانية الوصول", closeAccessTools: "إغلاق أدوات إمكانية الوصول",
    textSize: "حجم النص", standard: "قياسي", large: "كبير", strongerContrast: "تباين أقوى", contrastHelp: "يوضح النص والحدود ومؤشر التركيز مع الحفاظ على ألوانك.",
    dashboardColors: "ألوان لوحة المعلومات", motion: "الحركة", motionHelp: "يتبع النظام إعداد جهازك. تضيف الحركة السلسة انتقالات، ويبدّل الوضع المخفّض فورًا.", system: "النظام", smooth: "سلس", reduced: "مخفّض",
    language: "اللغة", languageHelp: "يترجم التنقل والعناوين وأدوات الوصول. يبقى محتوى العرض التفصيلي بالإنجليزية.", listen: "الاستماع إلى هذه الصفحة", stopReading: "إيقاف القراءة", readingStatus: "تتم قراءة هذه الصفحة بصوت عالٍ.", speechUnavailable: "تحويل النص إلى كلام غير متاح في هذا المتصفح.",
    nav: { main: "نظرة عامة", activity: "النشاط الأخير", savings: "هدف الادخار", finbot: "اسأل FinBot", dining: "مخطط الوجبات" },
    views: { main: { title: "اترك مساحة لما يهم.", description: "رؤية أوضح لليوم وثقة أكبر بالغد." }, activity: { title: "الأشياء الصغيرة تتراكم.", description: "نظرة أقرب على مشترياتك التجريبية الأخيرة." }, savings: { title: "أقرب قليلًا كل يوم.", description: "استعد لخطوتك التالية، مساهمة بعد أخرى." }, finbot: { title: "لنتحدث عن المال.", description: "استكشف أسئلتك من خلال محادثة تجريبية." } },
    workspace: "مساحة عملي", talkToFinbot: "تحدث مع FinBot", darkMode: "الوضع الداكن", lightMode: "الوضع الفاتح", demoSample: "عرض · بيانات تجريبية", plannerSample: "مخطط · مدخلات تجريبية",
    diningKicker: "وجبات الحرم تلتقي بميزانيتك", diningTitle: "اجعل كل وجبة وكل دولار مهمًا.", diningDescription: "ابنِ نظام وجبات للعام الدراسي حول خطة Virginia Tech وجدولك وتفضيلاتك وأرصدة الحرم.",
  },
  fr: {
    accessTools: "Outils d’accès", personalize: "À VOTRE FAÇON", accessibilityTools: "Outils d’accessibilité", closeAccessTools: "Fermer les outils d’accessibilité",
    textSize: "Taille du texte", standard: "Standard", large: "Grand", strongerContrast: "Contraste renforcé", contrastHelp: "Renforce le texte, les bordures et le focus sans remplacer vos couleurs.",
    dashboardColors: "Couleurs du tableau", motion: "Mouvement", motionHelp: "Système suit votre appareil. Fluide ajoute des transitions. Réduit change instantanément.", system: "Système", smooth: "Fluide", reduced: "Réduit",
    language: "Langue", languageHelp: "Traduit la navigation, les titres et les outils. Le contenu détaillé de démonstration reste en anglais.", listen: "Écouter cette vue", stopReading: "Arrêter la lecture", readingStatus: "Lecture de cette vue à voix haute.", speechUnavailable: "La synthèse vocale n’est pas disponible dans ce navigateur.",
    nav: { main: "Vue d’ensemble", activity: "Activité récente", savings: "Objectif d’épargne", finbot: "Demander à FinBot", dining: "Planificateur de repas" },
    views: { main: { title: "Faites de la place pour l’essentiel.", description: "Une vision plus claire d’aujourd’hui. Un peu plus de confiance pour demain." }, activity: { title: "Les petites dépenses s’additionnent.", description: "Regardez de plus près vos derniers achats d’exemple." }, savings: { title: "Un peu plus près chaque jour.", description: "Préparez votre prochain chapitre, une contribution à la fois." }, finbot: { title: "Parlons d’argent.", description: "Explorez vos questions avec une conversation d’exemple." } },
    workspace: "Mon espace", talkToFinbot: "Parler avec FinBot", darkMode: "Mode sombre", lightMode: "Mode clair", demoSample: "Démo · Données fictives", plannerSample: "Planificateur · Exemples",
    diningKicker: "LA RESTAURATION DU CAMPUS ET VOTRE BUDGET", diningTitle: "Faites compter chaque repas et chaque dollar.", diningDescription: "Organisez vos repas de l’année selon votre forfait Virginia Tech, votre emploi du temps, vos préférences et vos soldes campus.",
  },
  bn: {
    accessTools: "অ্যাক্সেস টুল", personalize: "নিজের মতো করুন", accessibilityTools: "অ্যাক্সেসিবিলিটি টুল", closeAccessTools: "অ্যাক্সেসিবিলিটি টুল বন্ধ করুন",
    textSize: "লেখার আকার", standard: "সাধারণ", large: "বড়", strongerContrast: "আরও কনট্রাস্ট", contrastHelp: "রং না বদলে লেখা, বর্ডার ও ফোকাস আরও স্পষ্ট করে।",
    dashboardColors: "ড্যাশবোর্ডের রং", motion: "মোশন", motionHelp: "সিস্টেম ডিভাইস অনুসরণ করে। স্মুথ ট্রানজিশন যোগ করে, রিডিউসড সঙ্গে সঙ্গে বদলায়।", system: "সিস্টেম", smooth: "স্মুথ", reduced: "কম",
    language: "ভাষা", languageHelp: "নেভিগেশন, শিরোনাম ও অ্যাক্সেস টুল অনুবাদ করে। বিস্তারিত ডেমো ইংরেজিতে থাকে।", listen: "এই ভিউ শুনুন", stopReading: "পড়া বন্ধ করুন", readingStatus: "এই ভিউ পড়ে শোনানো হচ্ছে।", speechUnavailable: "এই ব্রাউজারে টেক্সট-টু-স্পিচ নেই।",
    nav: { main: "সংক্ষিপ্ত বিবরণ", activity: "সাম্প্রতিক কার্যকলাপ", savings: "সঞ্চয়ের লক্ষ্য", finbot: "FinBot-কে জিজ্ঞাসা", dining: "খাবার পরিকল্পনা" },
    views: { main: { title: "যা গুরুত্বপূর্ণ তার জন্য জায়গা রাখুন।", description: "আজকে আরও পরিষ্কারভাবে দেখুন, আগামীকাল নিয়ে আরও আত্মবিশ্বাসী হন।" }, activity: { title: "ছোট খরচও জমে ওঠে।", description: "সাম্প্রতিক নমুনা কেনাকাটাগুলো দেখুন।" }, savings: { title: "প্রতিদিন একটু করে কাছে।", description: "একটি করে অবদান দিয়ে পরের অধ্যায়ের জন্য প্রস্তুত হন।" }, finbot: { title: "টাকার কথা বলি।", description: "একটি নমুনা কথোপকথনে আপনার প্রশ্নগুলো জানুন।" } },
    workspace: "আমার ওয়ার্কস্পেস", talkToFinbot: "FinBot-এর সঙ্গে কথা বলুন", darkMode: "ডার্ক মোড", lightMode: "লাইট মোড", demoSample: "ডেমো · নমুনা ডেটা", plannerSample: "পরিকল্পক · নমুনা ইনপুট",
    diningKicker: "ক্যাম্পাসের খাবার ও আপনার বাজেট", diningTitle: "প্রতিটি খাবার ও ডলারকে কাজে লাগান।", diningDescription: "Virginia Tech পরিকল্পনা, সময়সূচি, পছন্দ ও ক্যাম্পাস ব্যালেন্স অনুযায়ী বছরের খাবারের ছন্দ তৈরি করুন।",
  },
  pt: {
    accessTools: "Acessibilidade", personalize: "DEIXE DO SEU JEITO", accessibilityTools: "Ferramentas de acessibilidade", closeAccessTools: "Fechar ferramentas de acessibilidade",
    textSize: "Tamanho do texto", standard: "Padrão", large: "Grande", strongerContrast: "Mais contraste", contrastHelp: "Reforça texto, bordas e foco sem substituir suas cores.",
    dashboardColors: "Cores do painel", motion: "Movimento", motionHelp: "Sistema segue o dispositivo. Suave adiciona transições. Reduzido troca imediatamente.", system: "Sistema", smooth: "Suave", reduced: "Reduzido",
    language: "Idioma", languageHelp: "Traduz a navegação, os títulos e as ferramentas. O conteúdo detalhado da demonstração permanece em inglês.", listen: "Ouvir esta tela", stopReading: "Parar leitura", readingStatus: "Lendo esta tela em voz alta.", speechUnavailable: "A leitura de texto não está disponível neste navegador.",
    nav: { main: "Visão geral", activity: "Atividade recente", savings: "Meta de economia", finbot: "Perguntar ao FinBot", dining: "Planejador de refeições" },
    views: { main: { title: "Abra espaço para o que importa.", description: "Uma visão mais clara de hoje. Um pouco mais de confiança para amanhã." }, activity: { title: "As pequenas coisas se somam.", description: "Veja de perto suas compras de exemplo mais recentes." }, savings: { title: "Um pouco mais perto a cada dia.", description: "Prepare seu próximo capítulo, uma contribuição de cada vez." }, finbot: { title: "Vamos falar de dinheiro.", description: "Explore suas perguntas com uma conversa de exemplo." } },
    workspace: "Meu espaço", talkToFinbot: "Conversar com o FinBot", darkMode: "Modo escuro", lightMode: "Modo claro", demoSample: "Demo · Dados de exemplo", plannerSample: "Planejador · Exemplos",
    diningKicker: "ALIMENTAÇÃO NO CAMPUS E SEU ORÇAMENTO", diningTitle: "Faça cada refeição e cada dólar valerem.", diningDescription: "Monte uma rotina de refeições para o ano com seu plano Virginia Tech, horários, preferências e saldos do campus.",
  },
  ru: {
    accessTools: "Доступность", personalize: "НАСТРОЙТЕ ПОД СЕБЯ", accessibilityTools: "Настройки доступности", closeAccessTools: "Закрыть настройки доступности",
    textSize: "Размер текста", standard: "Обычный", large: "Крупный", strongerContrast: "Усилить контраст", contrastHelp: "Делает текст, границы и фокус заметнее, сохраняя выбранные цвета.",
    dashboardColors: "Цвета панели", motion: "Анимация", motionHelp: "Система следует настройкам устройства. Плавно добавляет переходы. Сокращённо переключает сразу.", system: "Система", smooth: "Плавно", reduced: "Сокращённо",
    language: "Язык", languageHelp: "Переводит навигацию, заголовки и настройки. Подробное демо остаётся на английском.", listen: "Прослушать страницу", stopReading: "Остановить чтение", readingStatus: "Страница читается вслух.", speechUnavailable: "Озвучивание текста недоступно в этом браузере.",
    nav: { main: "Обзор", activity: "Недавние операции", savings: "Цель накопления", finbot: "Спросить FinBot", dining: "План питания" },
    views: { main: { title: "Освободите место для важного.", description: "Больше ясности сегодня. Больше уверенности завтра." }, activity: { title: "Мелочи складываются.", description: "Посмотрите внимательнее на последние тестовые покупки." }, savings: { title: "Каждый день немного ближе.", description: "Готовьтесь к следующему этапу, шаг за шагом." }, finbot: { title: "Поговорим о деньгах.", description: "Разберите свои вопросы в тестовом диалоге." } },
    workspace: "Моё пространство", talkToFinbot: "Поговорить с FinBot", darkMode: "Тёмная тема", lightMode: "Светлая тема", demoSample: "Демо · Тестовые данные", plannerSample: "Планировщик · Тестовые данные",
    diningKicker: "ПИТАНИЕ В КАМПУСЕ И ВАШ БЮДЖЕТ", diningTitle: "Пусть каждый приём пищи и каждый доллар имеют значение.", diningDescription: "Составьте план питания на учебный год с учётом плана Virginia Tech, расписания, предпочтений и баланса кампуса.",
  },
  ur: {
    accessTools: "رسائی کے ٹولز", personalize: "اپنی پسند کے مطابق", accessibilityTools: "رسائی کے ٹولز", closeAccessTools: "رسائی کے ٹولز بند کریں",
    textSize: "متن کا سائز", standard: "معیاری", large: "بڑا", strongerContrast: "زیادہ کنٹراسٹ", contrastHelp: "آپ کے رنگ برقرار رکھتے ہوئے متن، سرحدیں اور فوکس واضح کرتا ہے۔",
    dashboardColors: "ڈیش بورڈ کے رنگ", motion: "حرکت", motionHelp: "سسٹم ڈیوائس کی ترتیب اپناتا ہے۔ ہموار منتقلی شامل کرتا ہے، کم حرکت فوراً بدلتی ہے۔", system: "سسٹم", smooth: "ہموار", reduced: "کم",
    language: "زبان", languageHelp: "نیویگیشن، عنوانات اور رسائی کے ٹولز کا ترجمہ کرتا ہے۔ تفصیلی ڈیمو انگریزی میں رہتا ہے۔", listen: "یہ منظر سنیں", stopReading: "پڑھنا بند کریں", readingStatus: "یہ منظر بلند آواز سے پڑھا جا رہا ہے۔", speechUnavailable: "اس براؤزر میں متن سے آواز دستیاب نہیں۔",
    nav: { main: "جائزہ", activity: "حالیہ سرگرمی", savings: "بچت کا ہدف", finbot: "FinBot سے پوچھیں", dining: "کھانے کی منصوبہ بندی" },
    views: { main: { title: "اہم چیزوں کے لیے جگہ بنائیں۔", description: "آج کی واضح تصویر، کل کے لیے زیادہ اعتماد۔" }, activity: { title: "چھوٹی چیزیں جمع ہوتی ہیں۔", description: "اپنی حالیہ نمونہ خریداری کو قریب سے دیکھیں۔" }, savings: { title: "ہر دن تھوڑا اور قریب۔", description: "ایک وقت میں ایک حصہ، اپنے اگلے مرحلے کے لیے تیاری کریں۔" }, finbot: { title: "پیسے کی بات کریں۔", description: "نمونہ گفتگو کے ساتھ اپنے سوالات دریافت کریں۔" } },
    workspace: "میرا ورک اسپیس", talkToFinbot: "FinBot سے بات کریں", darkMode: "ڈارک موڈ", lightMode: "لائٹ موڈ", demoSample: "ڈیمو · نمونہ ڈیٹا", plannerSample: "منصوبہ ساز · نمونہ معلومات",
    diningKicker: "کیمپس ڈائننگ اور آپ کا بجٹ", diningTitle: "ہر کھانے اور ہر ڈالر کو کارآمد بنائیں۔", diningDescription: "اپنے Virginia Tech پلان، شیڈول، ترجیحات اور کیمپس بیلنس کے مطابق تعلیمی سال کا کھانے کا معمول بنائیں۔",
  },
};

export function getInterfaceCopy(language: LanguageCode): InterfaceCopy {
  if (language === "en") return english;
  return { ...english, ...translations[language] };
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return languageOptions.some((language) => language.code === value);
}

export function isRtlLanguage(language: LanguageCode) {
  return language === "ar" || language === "ur";
}

export function getSpeechTag(language: LanguageCode) {
  return languageOptions.find((option) => option.code === language)?.speechTag ?? "en-US";
}
