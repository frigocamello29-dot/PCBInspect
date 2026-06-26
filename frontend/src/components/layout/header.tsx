'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/hooks/use-t';
import LangSwitcher from './lang-switcher';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const t = useT();

  const NAV_LINKS = [
    { href: '/detect', label: t.nav_detect },
    { href: '/annotate', label: t.nav_annotate },
    { href: '/detections', label: t.nav_history },
    { href: '/defect-types', label: t.nav_defect_types },
  ];

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header
      style={{
        height: 56,
        background: 'var(--bg-base)',
        borderBottom: '0.5px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <Link
        href="/detect"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
          fontSize: 15,
          color: 'var(--copper)',
          letterSpacing: '0.05em',
          textDecoration: 'none',
        }}
      >
        PCB INSPECT
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || (href !== '/detect' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: active ? 'var(--copper)' : 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                borderLeft: active ? '2px solid var(--copper)' : '2px solid transparent',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = 'var(--copper)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right: lang switcher + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LangSwitcher />
        {user && (
          <>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {user.full_name}
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '0.5px solid var(--bg-border)',
                borderRadius: 'var(--radius-md)',
                padding: '5px 12px',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'color 150ms ease, background 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-elevated)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {t.nav_sign_out}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
