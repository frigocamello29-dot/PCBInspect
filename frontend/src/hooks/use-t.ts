'use client';

import { useLangStore } from '@/store/lang-store';
import { translations } from '@/lib/i18n';

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return translations[lang];
}
