export type Lang = 'en' | 'ru';

function ruPlural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  const last2 = abs % 100;
  const last1 = abs % 10;
  if (last2 >= 11 && last2 <= 14) return many;
  if (last1 === 1) return one;
  if (last1 >= 2 && last1 <= 4) return few;
  return many;
}

export interface Translations {
  // Nav
  nav_detect: string;
  nav_annotate: string;
  nav_history: string;
  nav_defect_types: string;
  nav_sign_out: string;

  // Login
  login_tagline: string;
  login_email: string;
  login_password: string;
  login_submit: string;
  login_loading: string;
  login_no_account: string;
  login_create: string;
  login_error_invalid: string;
  login_error_generic: string;

  // Register
  register_tagline: string;
  register_full_name: string;
  register_email: string;
  register_password: string;
  register_confirm: string;
  register_placeholder_password: string;
  register_submit: string;
  register_loading: string;
  register_error_mismatch: string;
  register_error_short: string;
  register_error_exists: string;
  register_error_generic: string;
  register_have_account: string;
  register_sign_in: string;

  // Upload zone
  upload_drop: string;
  upload_hint: string;
  upload_browse: string;
  upload_camera: string;
  upload_clear: string;

  // Detect page
  analyze_button: string;
  uploading: string;
  analyzing: string;
  upload_failed: string;

  // Results panel
  results_idle_title: string;
  results_idle_sub: string;
  results_error_generic: string;
  results_overlay: string;
  results_original: string;
  no_defects_found: string;
  defects_found: (n: number) => string;

  // Camera
  camera_title: string;
  camera_error: string;
  camera_cancel: string;
  camera_capture: string;

  // Detections page
  filter_all: string;
  filter_defective: string;
  filter_ml: string;
  filter_annotated: string;
  filter_clear: string;
  detections_count: (n: number) => string;
  detections_error: string;
  no_results_filters: string;
  clear_filters: string;
  no_inspections: string;
  inspect_link: string;
  page_prev: string;
  page_next: string;

  // Detection detail
  back_history: string;
  not_found: string;
  delete_error: string;
  view_original: string;
  view_annotated: string;
  meta_model: string;
  meta_inference: string;
  meta_defects: string;
  meta_status: string;
  findings_title: string;
  confidence_label: string;
  download_image: string;
  delete_button: string;
  delete_dialog_title: string;
  delete_dialog_body: string;
  cancel: string;
  deleting: string;

  // Defect types
  defect_ref_title: string;
  defect_ref_sub: string;
  defect_types_error: string;
  no_example_image: string;
  defect_class: (id: number) => string;
  view_example: string;

  // Annotate page
  annotate_title: string;
  annotate_sub: string;
  annotate_clear_all: string;
  annotate_change_image: string;
  annotate_hint_draw: string;
  annotate_hint_select: string;
  annotate_upload_error: string;
  annotate_save_error: string;
  annotate_mode_draw: string;
  annotate_mode_select: string;

  // Annotation list
  no_annotations: string;
  annotations_count: (n: number) => string;
  annotate_hint_image_ready: string;
  annotate_hint_no_image: string;
  save_annotations: string;
  saving: string;
  annotations_saved: string;
  view_in_history: string;

  // Detection badges (history page)
  badge_pass: string;
  badge_manual: string;
  badge_defect_count: (n: number) => string;

  // Severity label
  severity_label: (s: string) => string;

  // Defect type data (id + API fallback)
  defect_name: (id: number, fallback: string) => string;
  defect_description: (id: number, fallback: string) => string;

  // Date locale
  date_locale: string;
}

const en: Translations = {
  nav_detect: 'Detect',
  nav_annotate: 'Annotate',
  nav_history: 'History',
  nav_defect_types: 'Defect types',
  nav_sign_out: 'Sign out',

  login_tagline: 'Sign in to your account',
  login_email: 'Email',
  login_password: 'Password',
  login_submit: 'Sign in',
  login_loading: 'Signing in…',
  login_no_account: 'No account?',
  login_create: 'Create one',
  login_error_invalid: 'Invalid email or password.',
  login_error_generic: 'Login failed. Try again.',

  register_tagline: 'Create your account',
  register_full_name: 'Full name',
  register_email: 'Email',
  register_password: 'Password',
  register_confirm: 'Confirm password',
  register_placeholder_password: 'Min. 8 characters',
  register_submit: 'Create account',
  register_loading: 'Creating account…',
  register_error_mismatch: 'Passwords do not match.',
  register_error_short: 'Password must be at least 8 characters.',
  register_error_exists: 'An account with this email already exists.',
  register_error_generic: 'Registration failed. Try again.',
  register_have_account: 'Already have an account?',
  register_sign_in: 'Sign in',

  upload_drop: 'Drop PCB image here',
  upload_hint: 'JPG, PNG, WEBP up to 10MB',
  upload_browse: 'Browse files',
  upload_camera: 'Use camera',
  upload_clear: 'Clear',

  analyze_button: 'Analyze image',
  uploading: 'Uploading…',
  analyzing: 'Analyzing…',
  upload_failed: 'Upload failed. Try again.',

  results_idle_title: 'No image analyzed yet',
  results_idle_sub: 'Upload a PCB image to start',
  results_error_generic: 'Analysis failed. Try uploading the image again.',
  results_overlay: 'Overlay',
  results_original: 'Original',
  no_defects_found: 'No defects found',
  defects_found: (n) => `${n} defect${n !== 1 ? 's' : ''} found`,

  camera_title: 'Camera capture',
  camera_error: 'Camera not available. Check browser permissions.',
  camera_cancel: 'Cancel',
  camera_capture: 'Capture',

  filter_all: 'All',
  filter_defective: 'Defective only',
  filter_ml: 'ML detected',
  filter_annotated: 'Annotated',
  filter_clear: 'Clear',
  detections_count: (n) => `${n} detection${n !== 1 ? 's' : ''}`,
  detections_error: 'Failed to load detections.',
  no_results_filters: 'No results for these filters',
  clear_filters: 'Clear filters',
  no_inspections: 'No inspections yet',
  inspect_link: 'Inspect an image →',
  page_prev: '< Prev',
  page_next: 'Next >',

  back_history: '← History',
  not_found: 'Detection not found.',
  delete_error: 'Failed to delete.',
  view_original: 'Original',
  view_annotated: 'Annotated',
  meta_model: 'Model',
  meta_inference: 'Inference',
  meta_defects: 'Defects',
  meta_status: 'Status',
  findings_title: 'FINDINGS',
  confidence_label: 'confidence',
  download_image: 'Download image',
  delete_button: 'Delete',
  delete_dialog_title: 'Delete this detection?',
  delete_dialog_body: "Can't be undone. The image and all findings will be permanently removed.",
  cancel: 'Cancel',
  deleting: 'Deleting…',

  defect_ref_title: 'PCB Defect Reference',
  defect_ref_sub: '6 standard defect classes',
  defect_types_error: 'Failed to load defect types.',
  no_example_image: 'No example image available',
  defect_class: (id) => `defect class ${id}`,
  view_example: 'View example →',

  annotate_title: 'Annotate',
  annotate_sub: 'Upload a PCB image, draw bounding boxes, and save annotations to history.',
  annotate_clear_all: 'Clear all',
  annotate_change_image: 'Change image',
  annotate_hint_draw: 'Click and drag on the image to draw a bounding box.',
  annotate_hint_select: 'Click a box to select it. Drag to move. Drag corner/edge handles to resize.',
  annotate_upload_error: 'Upload failed. Try uploading again.',
  annotate_save_error: 'Save failed. Try again.',
  annotate_mode_draw: 'draw',
  annotate_mode_select: 'select',

  no_annotations: 'No annotations',
  annotations_count: (n) => `${n} annotation${n !== 1 ? 's' : ''}`,
  annotate_hint_image_ready: 'Switch to Draw mode and drag on the image to add annotations.',
  annotate_hint_no_image: 'Upload an image to start annotating.',
  save_annotations: 'Save annotations',
  saving: 'Saving…',
  annotations_saved: 'Annotations saved.',
  view_in_history: 'View in history →',

  badge_pass: 'PASS',
  badge_manual: 'MANUAL',
  badge_defect_count: (n) => `${n} DEFECT${n !== 1 ? 'S' : ''}`,

  severity_label: (s) => s,

  defect_name: (_id, fallback) => fallback,
  defect_description: (_id, fallback) => fallback,

  date_locale: 'en-US',
};

const ru: Translations = {
  nav_detect: 'Анализ',
  nav_annotate: 'Разметка',
  nav_history: 'История',
  nav_defect_types: 'Типы дефектов',
  nav_sign_out: 'Выйти',

  login_tagline: 'Войдите в аккаунт',
  login_email: 'Эл. почта',
  login_password: 'Пароль',
  login_submit: 'Войти',
  login_loading: 'Вход…',
  login_no_account: 'Нет аккаунта?',
  login_create: 'Создать',
  login_error_invalid: 'Неверная почта или пароль.',
  login_error_generic: 'Ошибка входа. Попробуйте снова.',

  register_tagline: 'Создайте аккаунт',
  register_full_name: 'Полное имя',
  register_email: 'Эл. почта',
  register_password: 'Пароль',
  register_confirm: 'Подтверждение пароля',
  register_placeholder_password: 'Мин. 8 символов',
  register_submit: 'Создать аккаунт',
  register_loading: 'Создание…',
  register_error_mismatch: 'Пароли не совпадают.',
  register_error_short: 'Пароль должен содержать не менее 8 символов.',
  register_error_exists: 'Аккаунт с этой почтой уже существует.',
  register_error_generic: 'Ошибка регистрации. Попробуйте снова.',
  register_have_account: 'Уже есть аккаунт?',
  register_sign_in: 'Войти',

  upload_drop: 'Перетащите изображение платы',
  upload_hint: 'JPG, PNG, WEBP до 10 МБ',
  upload_browse: 'Выбрать файл',
  upload_camera: 'Камера',
  upload_clear: 'Очистить',

  analyze_button: 'Анализировать',
  uploading: 'Загрузка…',
  analyzing: 'Анализ…',
  upload_failed: 'Ошибка загрузки. Попробуйте снова.',

  results_idle_title: 'Изображение не загружено',
  results_idle_sub: 'Загрузите изображение платы',
  results_error_generic: 'Ошибка анализа. Попробуйте загрузить снова.',
  results_overlay: 'Наложение',
  results_original: 'Оригинал',
  no_defects_found: 'Дефектов не обнаружено',
  defects_found: (n) => `Найдено ${n} ${ruPlural(n, 'дефект', 'дефекта', 'дефектов')}`,

  camera_title: 'Захват камеры',
  camera_error: 'Камера недоступна. Проверьте разрешения браузера.',
  camera_cancel: 'Отмена',
  camera_capture: 'Снять',

  filter_all: 'Все',
  filter_defective: 'Только дефектные',
  filter_ml: 'ML-детекция',
  filter_annotated: 'Аннотированные',
  filter_clear: 'Сбросить',
  detections_count: (n) => `${n} ${ruPlural(n, 'проверка', 'проверки', 'проверок')}`,
  detections_error: 'Ошибка загрузки проверок.',
  no_results_filters: 'Нет результатов для этих фильтров',
  clear_filters: 'Сбросить фильтры',
  no_inspections: 'Проверок ещё нет',
  inspect_link: 'Проверить изображение →',
  page_prev: '← Назад',
  page_next: 'Вперёд →',

  back_history: '← История',
  not_found: 'Проверка не найдена.',
  delete_error: 'Ошибка удаления.',
  view_original: 'Оригинал',
  view_annotated: 'Аннотировано',
  meta_model: 'Модель',
  meta_inference: 'Инференс',
  meta_defects: 'Дефекты',
  meta_status: 'Статус',
  findings_title: 'РЕЗУЛЬТАТЫ',
  confidence_label: 'достоверность',
  download_image: 'Скачать',
  delete_button: 'Удалить',
  delete_dialog_title: 'Удалить эту проверку?',
  delete_dialog_body: 'Это действие необратимо. Изображение и все результаты будут удалены навсегда.',
  cancel: 'Отмена',
  deleting: 'Удаление…',

  defect_ref_title: 'Справочник дефектов',
  defect_ref_sub: '6 стандартных классов дефектов',
  defect_types_error: 'Ошибка загрузки типов дефектов.',
  no_example_image: 'Пример изображения недоступен',
  defect_class: (id) => `класс дефекта ${id}`,
  view_example: 'Смотреть пример →',

  annotate_title: 'Разметка',
  annotate_sub: 'Загрузите изображение платы, нарисуйте рамки и сохраните разметку в историю.',
  annotate_clear_all: 'Очистить всё',
  annotate_change_image: 'Сменить изображение',
  annotate_hint_draw: 'Кликните и перетащите на изображении, чтобы нарисовать рамку.',
  annotate_hint_select: 'Кликните на рамке для выбора. Перетащите для перемещения. Тяните за углы для изменения размера.',
  annotate_upload_error: 'Ошибка загрузки. Попробуйте снова.',
  annotate_save_error: 'Ошибка сохранения. Попробуйте снова.',
  annotate_mode_draw: 'рисовать',
  annotate_mode_select: 'перетащить',

  no_annotations: 'Нет аннотаций',
  annotations_count: (n) => `${n} ${ruPlural(n, 'аннотация', 'аннотации', 'аннотаций')}`,
  annotate_hint_image_ready: 'Перейдите в режим рисования и нарисуйте рамку.',
  annotate_hint_no_image: 'Загрузите изображение для начала разметки.',
  save_annotations: 'Сохранить разметку',
  saving: 'Сохранение…',
  annotations_saved: 'Разметка сохранена.',
  view_in_history: 'Просмотреть в истории →',

  badge_pass: 'НОРМА',
  badge_manual: 'РУЧНАЯ',
  badge_defect_count: (n) => `${n} ${ruPlural(n, 'ДЕФЕКТ', 'ДЕФЕКТА', 'ДЕФЕКТОВ')}`,

  severity_label: (s) => ({ low: 'низкий', medium: 'средний', high: 'высокий', critical: 'критический' } as Record<string, string>)[s] ?? s,

  defect_name: (id, fallback) => ({
    1: 'Отсутствующее отверстие',
    2: 'Неровность края',
    3: 'Обрыв цепи',
    4: 'Короткое замыкание',
    5: 'Выступ дорожки',
    6: 'Островки меди',
  } as Record<number, string>)[id] ?? fallback,

  defect_description: (id, fallback) => ({
    1: 'Отверстие не просверлено или полностью заблокировано',
    2: 'Небольшая выемка на крае проводника',
    3: 'Разрыв медной трассы',
    4: 'Непреднамеренное соединение между трассами',
    5: 'Выступающая медь от края трассы',
    6: 'Нежелательные кусочки медной фольги',
  } as Record<number, string>)[id] ?? fallback,

  date_locale: 'ru-RU',
};

export const translations: Record<Lang, Translations> = { en, ru };
