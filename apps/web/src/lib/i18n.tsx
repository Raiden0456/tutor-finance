import type React from 'react';
import { createContext, useContext } from 'react';
import { enUS, ru as dateFnsRu, type Locale as DateFnsLocale } from 'date-fns/locale';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

const ru: Record<string, string> = {
  // Navigation / common
  Dashboard: 'Панель',
  Students: 'Ученики',
  Lessons: 'Занятия',
  Transactions: 'Финансы',
  Settings: 'Настройки',
  Save: 'Сохранить',
  Cancel: 'Отмена',
  Delete: 'Удалить',
  Add: 'Добавить',
  Create: 'Создать',
  Edit: 'Изменить',
  Archive: 'Архивировать',
  Restore: 'Восстановить',
  Close: 'Закрыть',
  Loading: 'Загрузка',
  Error: 'Ошибка',
  Empty: 'Пусто',
  Search: 'Поиск',
  Filter: 'Фильтр',
  Date: 'Дата',
  Time: 'Время',
  Amount: 'Сумма',
  Currency: 'Валюта',
  Status: 'Статус',
  Type: 'Тип',
  Name: 'Имя',
  Email: 'Email',
  Password: 'Пароль',
  Continue: 'Продолжить',
  Submit: 'Отправить',
  'Go back': 'Назад',
  Back: 'Назад',
  'Try again': 'Попробовать снова',
  'No data': 'Нет данных',
  Confirm: 'Подтвердить',
  Pause: 'Пауза',
  Resume: 'Возобновить',
  Monday: 'Понедельник',
  Tuesday: 'Вторник',
  Wednesday: 'Среда',
  Thursday: 'Четверг',
  Friday: 'Пятница',
  Saturday: 'Суббота',
  Sunday: 'Воскресенье',

  // Auth
  'Sign in': 'Вход',
  'Sign up': 'Регистрация',
  'Sign out': 'Выйти',
  'Create account': 'Создать аккаунт',
  'Forgot password?': 'Забыли пароль?',
  'Reset password': 'Сбросить пароль',
  'Welcome back': 'С возвращением',
  Login: 'Войти',
  'Login with Google': 'Войти через Google',
  'Login with Apple': 'Войти через Apple',
  'Login with Meta': 'Войти через Meta',
  'Privacy Policy': 'Политика конфиденциальности',
  'Terms of Service': 'Условия использования',
  'Remember your password?': 'Вспомнили пароль?',
  'Already have an account?': 'Уже есть аккаунт?',
  "Don't have an account?": 'Нет аккаунта?',
  'Send reset link': 'Отправить ссылку',
  'New password': 'Новый пароль',
  'Confirm password': 'Подтвердите пароль',
  'Check your email': 'Проверьте почту',
  'Password reset link sent': 'Ссылка для сброса пароля отправлена',
  'Show password': 'Показать пароль',
  'Hide password': 'Скрыть пароль',
  'you@example.com': 'you@example.com',
  'Uchetka dashboard preview': 'Превью панели Учётки',
  'Sign in to your account': 'Войдите в аккаунт',
  'Sign in to your Uchetka account': 'Войдите в аккаунт Учётки',
  'Signing in…': 'Входим…',
  'No account?': 'Нет аккаунта?',
  'Email verified. You can sign in now.': 'Email подтверждён. Теперь можно войти.',
  'Invalid email or password': 'Неверный email или пароль',
  'Could not create account': 'Не удалось создать аккаунт',
  'Could not resend verification email': 'Не удалось повторно отправить письмо подтверждения',
  'Verification email sent again. Check your inbox.':
    'Письмо подтверждения отправлено ещё раз. Проверьте почту.',
  'We sent a verification link to': 'Мы отправили ссылку подтверждения на',
  'Verify it, then sign in.': 'Подтвердите email, затем войдите.',
  'Sending…': 'Отправляем…',
  'Resend verification email': 'Отправить письмо подтверждения ещё раз',
  'Go to sign in': 'Перейти ко входу',
  'At least 8 characters.': 'Минимум 8 символов.',
  'Creating account…': 'Создаём аккаунт…',
  'Already registered?': 'Уже зарегистрированы?',
  'Could not send reset email': 'Не удалось отправить письмо для сброса пароля',
  'Could not send verification email': 'Не удалось отправить письмо подтверждения',
  'Verification link sent. Check your inbox.': 'Ссылка подтверждения отправлена. Проверьте почту.',
  'If an account exists for': 'Если аккаунт существует для',
  'a reset link has been sent.': 'ссылка для сброса отправлена.',
  'You can request another link in {seconds}s.': 'Новая ссылка будет доступна через {seconds} с.',
  'Reset link sent again. Check your inbox.':
    'Ссылка для сброса отправлена ещё раз. Проверьте почту.',
  'Resend reset link': 'Отправить ссылку для сброса ещё раз',
  'Send verification link': 'Отправить ссылку подтверждения',
  'Back to sign in': 'Назад ко входу',
  'This reset link is invalid or expired. Request a new one.':
    'Эта ссылка для сброса недействительна или истекла. Запросите новую.',
  'Missing reset token. Use the link from your email.':
    'Отсутствует токен сброса. Используйте ссылку из письма.',
  'Missing or invalid reset token': 'Токен сброса отсутствует или недействителен',
  'Passwords do not match': 'Пароли не совпадают',
  'Could not reset password': 'Не удалось сбросить пароль',
  'Password updated. You can now sign in.': 'Пароль обновлён. Теперь можно войти.',
  'Request a new reset link': 'Запросить новую ссылку для сброса',
  'Updating…': 'Обновляем…',
  'Update password': 'Обновить пароль',

  // Theme / language
  Light: 'Светлая',
  Dark: 'Тёмная',
  System: 'Системная',
  'Toggle theme': 'Переключить тему',
  Language: 'Язык',
  English: 'Английский',
  Russian: 'Русский',

  // Dashboard
  'Your tutor finance dashboard: upcoming lessons, daily stats, recent income, and student activity at a glance.':
    'Финансовая панель репетитора: ближайшие занятия, статистика дня, доходы и активность учеников.',
  Today: 'Сегодня',
  'Upcoming lesson': 'Ближайшее занятие',
  'No upcoming lessons': 'Нет ближайших занятий',
  'Lessons today': 'Занятий сегодня',
  'Income today': 'Доход сегодня',
  Outstanding: 'К оплате',
  'Recent activity': 'Последняя активность',
  'Net income': 'Чистый доход',
  Income: 'Доход',
  Expense: 'Расход',
  Expenses: 'Расходы',
  Planned: 'План',
  Net: 'Итого',
  Profit: 'Прибыль',
  'Paid lessons': 'Оплаченные занятия',
  "Today's overview": 'Обзор дня',
  'Due Payment': 'К оплате',
  Done: 'Готово',
  'Total time': 'Общее время',
  Processed: 'Обработано',
  'No lessons today. Enjoy your day off!': 'Сегодня занятий нет. Наслаждайтесь выходным!',
  'Next session today': 'Следующее занятие сегодня',
  'Next session tomorrow': 'Следующее занятие завтра',
  'Next session · {date}': 'Следующее занятие · {date}',
  now: 'сейчас',
  'in {time}': 'через {time}',
  h: 'ч',
  d: 'д',
  Join: 'Подключиться',
  'All clear': 'Всё чисто',
  'Nothing on schedule this week': 'На этой неделе ничего нет',
  'The week is clear. Enjoy the time off!': 'Неделя свободна. Отдыхайте!',
  '{count} item': '{count} элемент',
  '{count} items': '{count} элементов',

  // Ranges
  '7d': '7 дн.',
  '30d': '30 дн.',
  '90d': '90 дн.',
  Custom: 'Период',

  // Students
  Student: 'Ученик',
  'Add student': 'Добавить ученика',
  'Edit student': 'Изменить ученика',
  'New student': 'Новый ученик',
  'Delete student?': 'Удалить ученика?',
  'Archive student?': 'Архивировать ученика?',
  'Archive this student?': 'Архивировать этого ученика?',
  'Archived students are hidden from the active list, but their history stays intact.':
    'Архивированные ученики скрываются из активного списка, но история сохраняется.',
  'No students yet': 'Учеников пока нет',
  '{count} active': '{count} активных',
  'Student name': 'Имя ученика',
  'Hourly rate': 'Ставка за час',
  '/ hr': '/ ч',
  'Lesson price': 'Цена занятия',
  'Default duration': 'Длительность по умолчанию',
  Contact: 'Контакт',
  Phone: 'Телефон',
  Notes: 'Заметки',
  'Add a note…': 'Добавьте заметку…',
  'Hourly rate stored in minor units; enter major value (e.g. 30.00).':
    'Ставка хранится в минорных единицах; введите основное значение (например, 30.00).',
  'Set an hourly rate or a prepaid lesson package.':
    'Задайте ставку за период или предоплаченный пакет занятий.',
  Pricing: 'Оплата',
  Hourly: 'Периодическая',
  Package: 'Пакет',
  Rate: 'Ставка',
  'Rate period (min)': 'Период ставки (мин)',
  'Lessons in package': 'Занятий в пакете',
  'Package price': 'Цена пакета',
  'Default lesson link': 'Ссылка занятия по умолчанию',
  'Telegram link': 'Ссылка Telegram',
  'WhatsApp link': 'Ссылка WhatsApp',
  lessons: 'занятий',
  'Lesson package': 'Пакет занятий',
  '{done} of {total} lessons used': 'Использовано {done} из {total} занятий',
  Remaining: 'Осталось',
  'Close package': 'Закрыть пакет',
  'Package overrun: {count} extra lessons': 'Превышение пакета: лишних занятий — {count}',
  'Package payment': 'Оплата пакета',
  'Mark package paid': 'Оплатить пакет',
  'Partial payment': 'Частичная оплата',
  'Partial package payment': 'Частичная оплата пакета',
  'Package price:': 'Цена пакета:',
  Unpaid: 'Не оплачен',
  'Included in package': 'Входит в пакет',
  'This stops using the current package for future lessons. Choose how many lessons stay covered by it.':
    'Это отключит текущий пакет для будущих занятий. Укажите, сколько занятий останется покрыто пакетом.',
  'Covered lessons from package': 'Покрыто занятий из пакета',
  'Add your first one to start tracking lessons.':
    'Добавьте первого ученика, чтобы начать отслеживать занятия.',
  'Top earners · this month': 'Лучшие по доходу · за месяц',
  'Lesson income totals ({currency})': 'Доходы от занятий ({currency})',
  Earned: 'Заработано',
  'Total earned': 'Всего заработано',
  'Total due': 'Всего к оплате',
  Upcoming: 'Предстоящие',
  Recent: 'Недавние',
  'No lessons yet': 'Занятий пока нет',
  Active: 'Активные',
  Archived: 'Архив',

  // Lessons
  Lesson: 'Занятие',
  'Lesson with {name}': 'Занятие с {name}',
  'Lesson details for {name}: schedule, payment status, notes, homework, and meeting link in Uchetka.':
    'Детали занятия с {name}: расписание, статус оплаты, заметки, домашка и ссылка на встречу в Uchetka.',
  'Plan, track, and archive tutor lessons with statuses, payments, homework, and meeting links.':
    'Планируйте, отслеживайте и архивируйте занятия со статусами, оплатами, домашкой и ссылками на встречи.',
  Scheduled: 'Запланировано',
  Completed: 'Завершено',
  Paid: 'Оплачено',
  Cancelled: 'Отменено',
  'No-show': 'Не пришёл',
  Due: 'К оплате',
  Partial: 'Частично',
  'Add lesson': 'Добавить занятие',
  'Edit lesson': 'Изменить занятие',
  'Edit Details': 'Изменить детали',
  'Delete lesson?': 'Удалить занятие?',
  'Reschedule lesson': 'Перенести занятие',
  'New date & time': 'Новая дата и время',
  'Duration (min)': 'Длительность (мин)',
  Duration: 'Длительность',
  min: 'мин',
  m: 'м',
  Homework: 'Домашка',
  'Add homework…': 'Добавьте домашку…',
  'Meeting link': 'Ссылка на встречу',
  'Join meeting': 'Открыть встречу',
  'Price override': 'Переопределить цену',
  'Mark as Paid': 'Оплачено',
  'Pay Remaining': 'Оплатить остаток',
  'Partial Payment': 'Частичная оплата',
  'Mark completed': 'Завершить',
  'Mark as Completed': 'Завершить',
  Reschedule: 'Перенести',
  'Cancel lesson': 'Отменить занятие',
  'View details': 'Открыть детали',
  'Save changes': 'Сохранить изменения',
  'Saving…': 'Сохранение…',
  'Leave blank to use hourly rate': 'Оставьте пустым, чтобы использовать почасовую ставку',
  'Date & time': 'Дата и время',
  'Full price:': 'Полная цена:',
  'Full lesson price:': 'Полная цена занятия:',
  'Amount received ({currency})': 'Получено ({currency})',
  'Paid {paid} of {total}': 'Оплачено {paid} из {total}',
  'This permanently deletes the lesson': 'Это навсегда удалит занятие',
  'This action cannot be undone.': 'Это действие нельзя отменить.',
  'Delete all': 'Удалить всё',
  'Delete all archived?': 'Удалить весь архив?',
  'No archived lessons': 'Архивных занятий нет',
  'This permanently deletes all {count} archived lessons. This action cannot be undone.':
    'Это навсегда удалит архивные занятия: {count}. Это действие нельзя отменить.',
  'Add a student first to log lessons.': 'Сначала добавьте ученика, чтобы записывать занятия.',
  'No lessons in this range.': 'В этом периоде занятий нет.',
  'No lessons on this day.': 'В этот день занятий нет.',
  'Single day mode': 'Режим одного дня',
  'Range mode': 'Режим периода',
  'Back to schedule': 'Назад к расписанию',
  'View archive': 'Открыть архив',
  Log: 'Записать',
  'New lesson': 'Новое занятие',
  'Log {count} lessons': 'Записать занятий: {count}',
  'Add slot': 'Добавить слот',
  'Create {count} lesson': 'Создать {count} занятие',
  'Create {count} lessons': 'Создать занятий: {count}',
  'Creating {done}/{total}…': 'Создание {done}/{total}…',
  'Creating {done} of {total}…': 'Создание {done} из {total}…',
  'Slot {index} ({date} {time}) failed': 'Слот {index} ({date} {time}) не создан',
  'Overlaps with {name} at {time}': 'Пересекается с {name} в {time}',
  'another lesson': 'другим занятием',
  'Schedule for this day': 'Расписание на этот день',
  'Time overlap detected': 'Обнаружено пересечение по времени',
  'No lessons': 'Занятий нет',
  'No lessons today': 'Сегодня занятий нет',
  Calendar: 'Календарь',
  Schedule: 'Расписание',
  Month: 'Месяц',
  Week: 'Неделя',
  Day: 'День',
  'This lesson': 'Это занятие',
  'and its income transaction': 'и связанную транзакцию дохода',

  // Lesson statuses
  scheduled: 'Запланировано',
  completed: 'Завершено',
  paid: 'Оплачено',
  due: 'К оплате',
  partially_paid: 'Частично оплачено',
  cancelled: 'Отменено',
  no_show: 'Не пришёл',

  // Transactions
  'Add transaction': 'Добавить транзакцию',
  'Edit transaction': 'Изменить транзакцию',
  'Delete transaction?': 'Удалить транзакцию?',
  'No transactions': 'Транзакций нет',
  'No transactions in this period.': 'За этот период транзакций нет.',
  '{count} entries': '{count} записей',
  '{count} rules': '{count} правил',
  Recurring: 'Повторяющиеся',
  'Add recurring expense': 'Добавить регулярный расход',
  'New recurring expense': 'Новый регулярный расход',
  'Edit recurring expense': 'Изменить регулярный расход',
  'Recurring expenses': 'Регулярные расходы',
  'No recurring expenses': 'Регулярных расходов нет',
  'No recurring expenses yet. Add one to automate regular costs.':
    'Регулярных расходов пока нет. Добавьте один, чтобы автоматизировать постоянные траты.',
  Category: 'Категория',
  Description: 'Описание',
  'Paid at': 'Дата оплаты',
  Frequency: 'Частота',
  'Start date': 'Дата начала',
  Paused: 'На паузе',
  'Every month': 'Каждый месяц',
  'Every week': 'Каждую неделю',
  'Every year': 'Каждый год',
  Monthly: 'Ежемесячно',
  Weekly: 'Еженедельно',
  Yearly: 'Ежегодно',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  Comparison: 'Сравнение',
  Overview: 'Обзор',
  Analytics: 'Аналитика',
  'New transaction': 'Новая транзакция',
  'Growth & period comparison': 'Рост и сравнение периодов',
  'Income vs Expenses': 'Доходы и расходы',
  'Expenses by category': 'Расходы по категориям',
  'Top {count} categories': 'Топ-{count} категорий',
  'day totals': 'Итоги по дням',
  'week totals': 'Итоги по неделям',
  'month totals': 'Итоги по месяцам',
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  Growth: 'Рост',
  'Compare Periods': 'Сравнить периоды',
  Current: 'Текущий',
  'Period A': 'Период A',
  'Period B': 'Период B',
  'Pick Period A': 'Выберите период A',
  'Pick Period B': 'Выберите период B',
  vs: 'против',
  New: 'Новый',
  'Select both periods to compare.': 'Выберите оба периода для сравнения.',
  'Period Comparison': 'Сравнение периодов',
  'Current vs Previous': 'Текущий против предыдущего',
  'Period A vs Period B': 'Период A против периода B',
  'category.lesson': 'занятие',
  'category.package': 'пакет',
  'category.consultation': 'консультация',
  'category.refund': 'возврат',
  'category.rent': 'аренда',
  'category.software': 'софт',
  'category.supplies': 'материалы',
  'category.utilities': 'коммунальные',
  'category.transport': 'транспорт',
  'category.food': 'еда',
  'category.marketing': 'маркетинг',
  'category.equipment': 'оборудование',
  'category.other': 'другое',

  // Settings
  'Open-source finance tracker for tutors: lessons, students, payments, and income in one clean dashboard.':
    'Open-source финансовый трекер для репетиторов: занятия, ученики, оплаты и доходы в одной чистой панели.',
  '{appName} finance tracker preview': 'Превью финансового трекера {appName}',
  'Sign in to Uchetka, an Open-source finance tracker for tutors. Track lessons, students, payments, and income without spreadsheet hell.':
    'Войдите в Uchetka — open-source финансовый трекер для репетиторов. Занятия, ученики, оплаты и доходы без ада в таблицах.',
  'Create your Uchetka account and manage tutor lessons, students, payments, and income in one clean dashboard.':
    'Создайте аккаунт Uchetka и управляйте занятиями, учениками, оплатами и доходами в одной чистой панели.',
  'Reset access to your Uchetka tutor finance dashboard.':
    'Восстановите доступ к финансовой панели репетитора Uchetka.',
  'Set a new password for your Uchetka tutor finance dashboard.':
    'Установите новый пароль для финансовой панели репетитора Uchetka.',
  'Manage tutor students, rates, notes, lesson history, and income in Uchetka.':
    'Управляйте учениками, ставками, заметками, историей занятий и доходом в Uchetka.',
  'Student profile for {name}: lessons, payments, notes, and tutor income history in Uchetka.':
    'Профиль ученика {name}: занятия, оплаты, заметки и история доходов в Uchetka.',
  'Track tutor income, expenses, recurring payments, and currency conversion in Uchetka.':
    'Отслеживайте доходы, расходы, регулярные платежи и конвертацию валют в Uchetka.',
  'Configure your Uchetka account, tutor finance preferences, currency, and profile settings.':
    'Настройте аккаунт Uchetka, финансовые предпочтения, валюту и профиль.',
  'Tutor finance tracker': 'Финансовый трекер репетитора',
  'Personalise the app': 'Настройте приложение под себя',
  Preferences: 'Предпочтения',
  'Primary currency': 'Основная валюта',
  'Week starts on': 'Неделя начинается с',
  Saved: 'Сохранено',
  Account: 'Аккаунт',
  'Base currency': 'Базовая валюта',
  'Default lesson duration': 'Длительность занятия по умолчанию',
  'Save settings': 'Сохранить настройки',
  'Settings saved': 'Настройки сохранены',

  // Recurring lesson schedules
  Schedules: 'Расписания',
  'Weekly template': 'Недельный шаблон',
  'Schedules create actual lessons only for the next 2 weeks. Future lessons are generated automatically as they get closer.':
    'Расписания создают реальные занятия только на ближайшие 2 недели. Дальние занятия появятся автоматически, когда подойдут ближе.',
  'Add schedule': 'Добавить расписание',
  'New schedule': 'Новое расписание',
  'Edit schedule': 'Изменить расписание',
  'No recurring schedules yet.': 'Расписаний пока нет.',
  'Day of week': 'День недели',
  'Days of week': 'Дни недели',
  'Start time': 'Время начала',
  'End date': 'Дата окончания',
  Biweekly: 'Раз в 2 недели',
  'Select student': 'Выбрать ученика',
  Saving: 'Сохранение',
  Remove: 'Убрать',

  // UI components
  'Open menu': 'Открыть меню',
  'Go to next page': 'Следующая страница',
  'Go to previous page': 'Предыдущая страница',
  'More pages': 'Ещё страницы',
  Next: 'Далее',
  Previous: 'Назад',
};

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {},
  ru,
};

export function normalizeLocale(locale: string | undefined | null): Locale {
  return locale === 'ru' ? 'ru' : defaultLocale;
}

export function getDateFnsLocale(locale: string | undefined | null): DateFnsLocale {
  return normalizeLocale(locale) === 'ru' ? dateFnsRu : enUS;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

export const I18nContext = createContext<{ locale: Locale; t: TFunction }>({
  locale: defaultLocale,
  t: createTranslator(defaultLocale),
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({
  locale,
  children,
}: {
  locale?: string | null;
  children: React.ReactNode;
}) {
  const normalized = normalizeLocale(locale);
  return (
    <I18nContext.Provider value={{ locale: normalized, t: createTranslator(normalized) }}>
      {children}
    </I18nContext.Provider>
  );
}

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
