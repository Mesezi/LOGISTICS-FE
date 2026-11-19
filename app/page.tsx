'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { isAxiosError } from 'axios';
import { authApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { setTokenGetter } from '@/lib/api';

export default function RootPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace('/sign-in'); return; }

    let active = true;
    setTokenGetter(getToken);

    authApi.me()
      .then(() => router.replace('/dashboard'))
      .catch((err) => {
        // 404 means user has no account yet — go to onboarding
        if (isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 401)) {
          router.replace('/onboarding');
        } else {
          if (active) {
            setError('Could not verify your account. Check your connection and try again.');
          }
        }
      });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, getToken, router, retryCount]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p role="alert" className="text-sm text-loss">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError('');
            setRetryCount((count) => count + 1);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8 text-violet-500" />
    </div>
  );
}
