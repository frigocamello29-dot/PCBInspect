'use client';

import { create } from 'zustand';
import { Lang } from '@/lib/i18n';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: 'en',
  setLang: (lang) => {
    try { localStorage.setItem('pcb-lang', lang); } catch {}
    set({ lang });
  },
}));
