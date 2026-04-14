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
    // Salva token se veio no query string (redirect pós-OAuth)
    const token = searchParams.get('token');
    if (token) saveSellerToken(token);

    router.replace(`/seller/${params.id}/dashboard`);
  }, [params.id, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function SellerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SellerRoot />
    </Suspense>
  );
}
