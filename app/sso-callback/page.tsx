'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SSOCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();

  useEffect(() => {
    handleRedirectCallback({
      signInForceRedirectUrl:  '/',
      signUpForceRedirectUrl:  '/',
    });
  }, [handleRedirectCallback, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <p className="text-sm text-ink-muted">Completing sign in…</p>
    </div>
  );
}
