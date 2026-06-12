'use client';

import { useParams } from 'next/navigation';
import ProtectedLayout from '@/components/layout/protected-layout';

export default function DetectionDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <ProtectedLayout>
      <div style={{ padding: '32px 24px' }}>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: 'var(--text-primary)' }}>
          Detection {id}
        </h1>
      </div>
    </ProtectedLayout>
  );
}
