'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPost, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { User } from '@/lib/auth';
import { useT } from '@/hooks/use-t';
import LangSwitcher from '@/components/layout/lang-switcher';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--bg-border)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color 150ms ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

function focusIn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--copper)';
}
function focusOut(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--bg-border)';
}

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const t = useT();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError(t.register_error_mismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.register_error_short);
      return;
    }

    setLoading(true);
    try {
      const user = await apiPost<User>('/api/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      setUser(user);
      router.replace('/detect');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t.register_error_exists);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.register_error_generic);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)', position: 'relative' }}
    >
      <div style={{ position: 'absolute', top: 16, right: 24 }}>
        <LangSwitcher />
      </div>

      <div
        className="w-full"
        style={{
          maxWidth: 420,
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--bg-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
        }}
      >
        <div className="text-center mb-8">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 500,
              fontSize: 22,
              color: 'var(--copper)',
              letterSpacing: '0.05em',
            }}
          >
            PCB INSPECT
          </span>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
            {t.register_tagline}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="full_name" style={labelStyle}>{t.register_full_name}</label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" style={labelStyle}>{t.register_email}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" style={labelStyle}>{t.register_password}</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.register_placeholder_password}
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirm" style={labelStyle}>{t.register_confirm}</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>

          {error && (
            <p
              style={{
                color: 'var(--red-fail)',
                fontSize: 13,
                marginBottom: 16,
                padding: '8px 12px',
                background: 'rgba(239,68,68,0.08)',
                borderRadius: 'var(--radius-md)',
                border: '0.5px solid rgba(239,68,68,0.3)',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'var(--copper-muted)' : 'var(--copper)',
              color: '#0D0F0E',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--copper-muted)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--copper)'; }}
          >
            {loading ? t.register_loading : t.register_submit}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
          {t.register_have_account}{' '}
          <Link
            href="/login"
            style={{ color: 'var(--copper)', textDecoration: 'none', fontWeight: 500 }}
          >
            {t.register_sign_in}
          </Link>
        </p>
      </div>
    </main>
  );
}
