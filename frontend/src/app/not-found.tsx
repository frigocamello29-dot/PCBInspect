import Link from 'next/link';

export default function NotFound() {
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
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 64,
          fontWeight: 500,
          color: 'var(--copper)',
          lineHeight: 1,
          marginBottom: 16,
        }}>404</div>
        <h1 style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: '0 0 10px',
        }}>Page not found</h1>
        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/detect"
          style={{
            display: 'inline-block',
            background: 'var(--copper)',
            color: '#0D0F0E',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: 14,
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
          }}
        >
          Go to Detect
        </Link>
      </div>
    </div>
  );
}
