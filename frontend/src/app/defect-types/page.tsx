'use client';

import ProtectedLayout from '@/components/layout/protected-layout';

export default function DefectTypesPage() {
  return (
    <ProtectedLayout>
      <div style={{ padding: '32px 24px' }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: 'var(--text-primary)' }}>
          PCB Defect Reference
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
          6 standard defect classes
        </p>
      </div>
    </ProtectedLayout>
  );
}
