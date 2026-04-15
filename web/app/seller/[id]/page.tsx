'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { saveSellerToken } from '../../../lib/sellerApi';
import { Suspense } from 'react';

function SellerRoot() {
  const params       = useParams<{ id: string }>();
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) saveSellerToken(token);
    router.replace(`/seller/${params.id}/dashboard`);
  }, [params.id, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }}
      />
    </div>
  );
}

export default function SellerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }}
          />
        </div>
      }
    >
      <SellerRoot />
    </Suspense>
  );
}
