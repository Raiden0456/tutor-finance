import * as React from 'react';
import { enUS, ru as dateFnsRu, type Locale as DateFnsLocale } from 'date-fns/locale';
import { storage, STORAGE_KEYS } from '~/lib/storage';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Russian dictionary ported verbatim from apps/web/src/lib/i18n.tsx so the two
// clients stay in sync. English falls back to the key itself.
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
  OR: 'ИЛИ',
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
  'Login with': 'Войти через',
  'OR create new account with email': 'ИЛИ создайте аккаунт через email',
  'Sign in with Google': 'Войти через Google',
  'Could not sign in with Google': 'Не удалось войти через Google',
  'Privacy Policy': 'Политика конфиденциальности',
  'Terms of Service': 'Условия использования',
  Profile: 'Профиль',
  'Remember your password?': 'Вспомнили пароль?',
  'Already have an account?': 'Уже есть аккаунт?',
  "Don't have an account?": 'Нет аккаунта?',
  'Send reset link': 'Отправить ссылку',
  'New password': 'Новый пароль',
  'Current password': 'Текущий пароль',
  'Confirm password': 'Подтвердите пароль',
  'Check your email': 'Проверьте почту',
  'Password reset link sent': 'Ссылка для сброса пароля отправлена',
  'Show password': 'Показать пароль',
  'Hide password': 'Скрыть пароль',
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
  'Could not update password': 'Не удалось обновить пароль',
  'Password updated': 'Пароль обновлён',
  'Password added': 'Пароль добавлен',
  'Add password': 'Добавить пароль',
  'Change password': 'Изменить пароль',
  'Update your password for email sign-in.': 'Обновите пароль для входа через email.',
  'Add a password to sign in with email as well as Google.':
    'Добавьте пароль, чтобы входить через email и Google.',
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
  Theme: 'Тема',

  // Dashboard
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
  'Back to schedule': 'Назад к расписанию',
  'View archive': 'Открыть архив',
  Log: 'Записать',
  'New lesson': 'Новое занятие',
  'Add slot': 'Добавить слот',
  'Create {count} lesson': 'Создать {count} занятие',
  'Create {count} lessons': 'Создать занятий: {count}',
  'Overlaps with {name} at {time}': 'Пересекается с {name} в {time}',
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
  'Income vs Expenses': 'Доходы и расходы',
  'Expenses by category': 'Расходы по категориям',
  'Top {count} categories': 'Топ-{count} категорий',
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  Growth: 'Рост',
  'Compare Periods': 'Сравнить периоды',
  Current: 'Текущий',
  'Period A': 'Период A',
  'Period B': 'Период B',
  'Select both periods to compare.': 'Выберите оба периода для сравнения.',
  'Period Comparison': 'Сравнение периодов',
  'Current vs Previous': 'Текущий против предыдущего',
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
  'Tutor finance tracker': 'Финансовый трекер репетитора',
  'Personalise the app': 'Настройте приложение под себя',
  Preferences: 'Предпочтения',
  Security: 'Безопасность',
  'Primary currency': 'Основная валюта',
  'Week starts on': 'Неделя начинается с',
  Saved: 'Сохранено',
  Account: 'Аккаунт',
  'Base currency': 'Базовая валюта',
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

  // UI
  'Open menu': 'Открыть меню',
  Next: 'Далее',
  Previous: 'Назад',

  // Google Calendar sync
  'Google Calendar': 'Google Calendar',
  'Could not load calendar status': 'Не удалось загрузить статус календаря',
  'Could not connect Google Calendar': 'Не удалось подключить Google Calendar',
  'Could not disconnect Google Calendar': 'Не удалось отключить Google Calendar',
  'Could not sync Google Calendar': 'Не удалось синхронизировать Google Calendar',
  'Sync Google Calendar now': 'Синхронизировать Google Calendar сейчас',
  'Sync lessons to your Google Calendar. First, connect a Google account to this profile.':
    'Синхронизируйте занятия с Google Calendar. Сначала привяжите Google аккаунт к профилю.',
  'Connect Google and Calendar': 'Подключить Google и календарь',
  'Connect Google Calendar': 'Подключить Google Calendar',
  'Opening Google…': 'Открываем Google…',
  'Finishing setup…': 'Завершаем настройку…',
  Connected: 'Подключено',
  'Last sync: {when}': 'Последняя синхронизация: {when}',
  '{count} pending updates': 'В очереди обновлений: {count}',
  Disconnect: 'Отключить',
  'Disconnect Google Calendar?': 'Отключить Google Calendar?',
  'Future lesson changes will stop syncing. Existing events stay in Google unless you remove them.':
    'Будущие изменения занятий перестанут синхронизироваться. Уже созданные события останутся в Google, если не удалить их.',
  'Also delete the Uchetka calendar from my Google account':
    'Также удалить календарь Uchetka из моего Google аккаунта',
  'Finish setup': 'Завершить настройку',
};

const dictionaries: Record<Locale, Record<string, string>> = { en: {}, ru };

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

type I18nContextValue = {
  locale: Locale;
  t: TFunction;
  setLocale: (locale: Locale) => void;
};

const I18nContext = React.createContext<I18nContextValue>({
  locale: defaultLocale,
  t: createTranslator(defaultLocale),
  setLocale: () => {},
});

export function useI18n() {
  return React.useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(defaultLocale);

  React.useEffect(() => {
    void storage.get(STORAGE_KEYS.locale).then((stored) => {
      if (stored) setLocaleState(normalizeLocale(stored));
    });
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    void storage.set(STORAGE_KEYS.locale, next);
  }, []);

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, t: createTranslator(locale), setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
