'use client';

import { useEffect } from 'react';
import { useLangStore } from '@/store/lang-store';
import { Lang } from '@/lib/i18n';

export default function LangInitializer() {
  const setLang = useLangStore((s) => s.setLang);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pcb-lang') as Lang | null;
      if (stored === 'en' || stored === 'ru') setLang(stored);
    } catch {}
  }, [setLang]);
  return null;
}
