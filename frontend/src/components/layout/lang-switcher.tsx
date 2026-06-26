'use client';

import { useLangStore } from '@/store/lang-store';

export default function LangSwitcher() {
  const { lang, setLang } = useLangStore();

  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {(['en', 'ru'] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => !active && setLang(l)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.05em',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '0.5px solid',
              borderColor: active ? 'var(--copper-muted)' : 'var(--bg-border)',
              background: active ? 'rgba(200,121,65,0.12)' : 'transparent',
              color: active ? 'var(--copper)' : 'var(--text-dim)',
              cursor: active ? 'default' : 'pointer',
              textTransform: 'uppercase',
              transition: 'border-color 150ms ease, background 150ms ease, color 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = 'var(--bg-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = 'var(--bg-border)';
                e.currentTarget.style.color = 'var(--text-dim)';
              }
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
