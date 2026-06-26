'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{
          width: 56, height: 56,
          background: 'rgba(239,68,68,0.1)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.5"/>
            <line x1="12" y1="7" x2="12" y2="13" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="16.5" r="0.75" fill="#EF4444"/>
          </svg>
        </div>
        <h1 style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: '0 0 10px',
        }}>Something went wrong</h1>
        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}>
          An unexpected error occurred. Try refreshing the page.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              background: 'var(--copper)',
              color: '#0D0F0E',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--copper-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--copper)')}
          >
            Try again
          </button>
          <a
            href="/detect"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              border: '0.5px solid var(--bg-border)',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
