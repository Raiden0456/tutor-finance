export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

const ru: Record<string, string> = {
  // Nav
  Features: 'Возможности',
  Preview: 'Превью',
  Pricing: 'Цена',
  'Open source': 'Open source',
  'Sign in': 'Войти',
  'Try the beta': 'Попробовать бету',
  'Toggle theme': 'Переключить тему',
  Light: 'Светлая',
  Dark: 'Тёмная',
  System: 'Системная',

  // Hero
  'Open beta': 'Открытая бета',
  'Know what your tutoring actually earns.':
    'Понимайте, сколько вам реально приносит репетиторство.',
  'Lessons, students, payments and expenses in one place — across any currency.':
    'Занятия, ученики, оплаты и расходы в одном месте, в любой валюте.',
  'View on GitHub': 'Посмотреть на GitHub',
  'Uchetka dashboard preview': 'Превью панели Uchetka',

  // Features
  'Everything you need to run your tutoring practice': 'Всё, что нужно для практики репетитора',
  'Built for tutors who teach across schedules, students, and currencies.':
    'Создано для репетиторов, работающих с разными расписаниями, учениками и валютами.',
  'Lessons & schedule': 'Занятия и расписание',
  'Plan single and recurring lessons, see today at a glance, reschedule in two taps.':
    'Планируйте разовые и регулярные занятия, смотрите день одним взглядом, переносите в два касания.',
  'Students CRM': 'CRM учеников',
  'Profiles, contact info, hourly rates, payment history — one source of truth per student.':
    'Профили, контакты, ставка за час, история оплат — одна карточка на ученика.',
  'Multi-currency': 'Мультивалютность',
  'USD, EUR, RUB, GBP, UAH, KZT, TRY, PLN, USDT, USDC. FX rates refresh daily.':
    'USD, EUR, RUB, GBP, UAH, KZT, TRY, PLN, USDT, USDC. Курсы обновляются ежедневно.',
  'Recurring transactions': 'Регулярные операции',
  'Set up rent, subscriptions, retainers once — let Uchetka post them on schedule.':
    'Настройте аренду, подписки, оклады один раз — Uchetka проведёт их по расписанию.',
  'Dashboard analytics': 'Аналитика',
  'Income, expenses, outstanding payments, net profit — broken down by period.':
    'Доходы, расходы, задолженности, чистая прибыль — по периодам.',
  'Self-hostable': 'Self-hosted',
  'MIT licensed. Run it on your own server with Docker. Your data stays yours.':
    'Лицензия MIT. Разверните на своём сервере через Docker. Данные остаются у вас.',

  // Preview
  'See it in action': 'Посмотрите в действии',
  'A clean, mobile-first interface designed for daily use.':
    'Чистый mobile-first интерфейс, удобный для ежедневного использования.',
  'Dashboard screenshot': 'Скриншот панели',
  'Lessons screenshot': 'Скриншот занятий',
  'Transactions screenshot': 'Скриншот операций',

  // Pricing
  'Simple, honest pricing': 'Простая и честная цена',
  'Free in beta. Pick a plan when we launch — or self-host forever.':
    'Бесплатно в бете. Выберите план после релиза — или хостите сами навсегда.',
  '/ month': '/ мес',
  'Free in beta': 'Бесплатно в бете',
  'Always free': 'Всегда бесплатно',
  'Best value': 'Выгоднее всего',
  Free: 'Бесплатно',
  'Beta testers get +3 months of Pro free at launch.':
    'Бета-тестеры получают +3 месяца Pro бесплатно после релиза.',
  'Join the beta': 'Присоединиться к бете',
  'Get started': 'Начать',
  'Or self-host — free forever': 'Или self-host — бесплатно, навсегда',
  'Clone the repo and run it on your own server. Same features, MIT licensed, your data stays yours.':
    'Склонируйте репозиторий и запустите на своём сервере. Те же функции, лицензия MIT, данные остаются у вас.',
  'Clone on GitHub': 'Склонировать с GitHub',

  // Pricing — plans
  Starter: 'Старт',
  Pro: 'Профи',
  Expert: 'Эксперт',
  'Try Uchetka without commitment. Perfect to see if it fits your practice.':
    'Попробуйте Uchetka без обязательств. Чтобы понять, подходит ли вам.',
  'For active tutors — unlimited students and the tools you use daily.':
    'Для активных репетиторов — без лимитов и инструменты на каждый день.',
  'Maximum automation. Save hours every week with reminders and integrations.':
    'Максимум автоматизации. Экономьте часы каждую неделю на напоминаниях и интеграциях.',

  // Pricing — features (Dashboard analytics reuses the Features-section key)
  'Lesson schedule & calendar': 'Расписание занятий и календарь',
  'Income & expense tracking': 'Учёт доходов и расходов',
  'Up to 5 students': 'До 5 учеников',
  'Everything in Starter': 'Всё из «Старт»',
  'Unlimited students & lessons': 'Без лимитов на учеников и занятия',
  'Google & Yandex Disk sync': 'Синхронизация с Google и Яндекс Диском',
  'Google & Yandex Calendar sync': 'Синхронизация с Google и Яндекс Календарём',
  'CSV / Excel export': 'Экспорт в CSV / Excel',
  'Everything in Pro': 'Всё из «Профи»',
  'Email notifications': 'Email-уведомления',
  'Priority support': 'Приоритетная поддержка',
  'Exclusive features & early access to experimental updates':
    'Эксклюзивные фичи и ранний доступ к экспериментальным обновлениям',

  // Open source (heading reuses the Nav 'Open source' key)
  'Made by the community, with love. Contributions welcome.':
    'Сделан сообществом, с любовью. Контрибуты приветствуются.',
  'Star on GitHub': 'Поставить звезду',

  // Footer
  'Finance tracker for tutors.': 'Финансовый трекер для репетиторов.',
  'All rights reserved.': 'Все права защищены.',
  'MIT License': 'MIT License',
  'Terms of Service': 'Пользовательское соглашение',
  'Privacy Policy': 'Политика конфиденциальности',
  Language: 'Язык',

  // Legal
  'Last updated': 'Обновлено',
};

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {},
  ru,
};

export function normalizeLocale(locale: string | undefined | null): Locale {
  return locale === 'ru' ? 'ru' : defaultLocale;
}

export function createTranslator(locale: string | undefined | null) {
  const normalized = normalizeLocale(locale);
  return (key: string, params?: Record<string, string | number>) => {
    let value = dictionaries[normalized][key] ?? key;
    if (params) {
      for (const [param, replacement] of Object.entries(params)) {
        value = value.replaceAll(`{${param}}`, String(replacement));
      }
    }
    return value;
  };
}

export type TFunction = ReturnType<typeof createTranslator>;

export function stripLocale(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'en' || parts[0] === 'ru') {
    return '/' + parts.slice(1).join('/');
  }
  return pathname || '/';
}

export function localizePath(pathname: string, locale: Locale) {
  const clean = stripLocale(pathname);
  if (locale === defaultLocale) return clean === '' ? '/' : clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}
