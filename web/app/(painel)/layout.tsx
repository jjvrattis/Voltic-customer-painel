'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getAdminToken } from '@/lib/api';

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getAdminToken()) router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-volt-ambient">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

