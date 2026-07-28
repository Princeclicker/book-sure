const locales = {
  en: {
    nav: { solutions: 'Solutions', pricing: 'About', about: 'About', contact: 'Contact', faq: 'FAQ', signIn: 'Sign In', getStarted: 'Get Started Free' },
    hero: { title: 'Scheduling Made', titleHighlight: 'Simple', subtitle: 'The 7-in-1 booking platform. Simplify your calendar and easily schedule events without the need for back-and-forth emails to find the perfect time.', cta: 'Get Started Free', secondary: 'See How It Works', trial: 'Get started in minutes. It\'s free.' },
    features: { title: 'Everything You Need', subtitle: 'A complete suite of tools to manage your appointments, team, and clients.' },
    footer: { product: 'Product', solutions: 'Solutions', contact: 'Contact', rights: 'All rights reserved.' },
  },
  fr: {
    nav: { solutions: 'Solutions', pricing: 'À propos', about: 'À propos', contact: 'Contact', faq: 'FAQ', signIn: 'Connexion', getStarted: 'Commencez Gratuitement' },
    hero: { title: 'Planification', titleHighlight: 'Simplifiée', subtitle: "La plateforme de réservation 7-en-1. Simplifiez votre calendrier et planifiez facilement des événements sans échanges d'e-mails interminables.", cta: 'Commencez Gratuitement', secondary: 'Voir Comment Ça Marche', trial: 'Commencez en quelques minutes. C\'est gratuit.' },
    features: { title: 'Tout Ce Dont Vous Avez Besoin', subtitle: 'Une suite complète d\'outils pour gérer vos rendez-vous, votre équipe et vos clients.' },
    footer: { product: 'Produit', solutions: 'Solutions', contact: 'Contact', rights: 'Tous droits réservés.' },
  },
  es: {
    nav: { solutions: 'Soluciones', pricing: 'Nosotros', about: 'Nosotros', contact: 'Contacto', faq: 'FAQ', signIn: 'Iniciar Sesión', getStarted: 'Empieza Gratis' },
    hero: { title: 'Programación', titleHighlight: 'Simplificada', subtitle: 'La plataforma de reservas 7 en 1. Simplifica tu calendario y programa eventos fácilmente sin necesidad de intercambiar correos electrónicos.', cta: 'Empieza Gratis', secondary: 'Ver Cómo Funciona', trial: 'Empieza en minutos. Es gratis.' },
    features: { title: 'Todo Lo Que Necesitas', subtitle: 'Un conjunto completo de herramientas para gestionar tus citas, equipo y clientes.' },
    footer: { product: 'Producto', solutions: 'Soluciones', contact: 'Contacto', rights: 'Todos los derechos reservados.' },
  },
  de: {
    nav: { solutions: 'Lösungen', pricing: 'Über uns', about: 'Über uns', contact: 'Kontakt', faq: 'FAQ', signIn: 'Anmelden', getStarted: 'Kostenlos Starten' },
    hero: { title: 'Terminplanung', titleHighlight: 'Vereinfacht', subtitle: 'Die 7-in-1-Buchungsplattform. Vereinfachen Sie Ihren Kalender und planen Sie Termine ohne lästiges E-Mail-Hin und Her.', cta: 'Kostenlos Starten', secondary: 'So Funktioniert Es', trial: 'In Minuten starten. Es ist kostenlos.' },
    features: { title: 'Alles Was Sie Brauchen', subtitle: 'Eine komplette Suite von Werkzeugen zur Verwaltung Ihrer Termine, Ihres Teams und Ihrer Kunden.' },
    footer: { product: 'Produkt', solutions: 'Lösungen', contact: 'Kontakt', rights: 'Alle Rechte vorbehalten.' },
  },
  pt: {
    nav: { solutions: 'Soluções', pricing: 'Sobre', about: 'Sobre', contact: 'Contato', faq: 'FAQ', signIn: 'Entrar', getStarted: 'Comece Grátis' },
    hero: { title: 'Agendamento', titleHighlight: 'Simplificado', subtitle: 'A plataforma de reservas 7 em 1. Simplifique sua agenda e agende eventos facilmente sem necessidade de e-mails intermináveis.', cta: 'Comece Grátis', secondary: 'Veja Como Funciona', trial: 'Comece em minutos. É grátis.' },
    features: { title: 'Tudo Que Você Precisa', subtitle: 'Um conjunto completo de ferramentas para gerenciar seus compromissos, equipe e clientes.' },
    footer: { product: 'Produto', solutions: 'Soluções', contact: 'Contato', rights: 'Todos os direitos reservados.' },
  },
  ar: {
    nav: { solutions: 'الحلول', pricing: 'عننا', about: 'عننا', contact: 'اتصل بنا', faq: 'الأسئلة الشائعة', signIn: 'تسجيل الدخول', getStarted: 'ابدأ مجاناً' },
    hero: { title: 'الجدولة', titleHighlight: 'مبسطة', subtitle: 'منصة الحجز 7 في 1. بسّط تقويمك وجدولة الأحداث بسهولة دون الحاجة إلى تبادل رسائل البريد الإلكتروني.', cta: 'ابدأ مجاناً', secondary: 'شاهد كيف يعمل', trial: 'ابدأ في دقائق. مجاني.' },
    features: { title: 'كل ما تحتاجه', subtitle: 'مجموعة كاملة من الأدوات لإدارة مواعيدك وفريقك وعملائك.' },
    footer: { product: 'المنتج', solutions: 'الحلول', contact: 'اتصل بنا', rights: 'جميع الحقوق محفوظة.' },
  },
}

export type Locale = keyof typeof locales
export type TranslationKey = keyof typeof locales.en

export function getLocale(lang: string): Locale {
  if (lang in locales) return lang as Locale
  const short = lang.split('-')[0]
  if (short in locales) return short as Locale
  return 'en'
}

export function getTranslations(locale: Locale) {
  return locales[locale] || locales.en
}

export const supportedLocales = Object.keys(locales) as Locale[]

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ar: 'العربية',
}
