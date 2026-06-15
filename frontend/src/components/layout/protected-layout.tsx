'use client';

import AuthGuard from './auth-guard';
import Header from './header';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
