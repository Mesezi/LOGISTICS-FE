'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { authApi, setTokenGetter } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function OnboardingContent() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded) setTokenGetter(getToken);
  }, [isLoaded, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // If there's an invite token, accept it immediately
    if (inviteToken) {
      setLoading(true);
      authApi.acceptInvitation(inviteToken)
        .then(() => router.replace('/dashboard'))
        .catch((e) => {
          setError(e?.response?.data?.message ?? 'Invalid or expired invitation.');
          setLoading(false);
        });
    }
  }, [isLoaded, isSignedIn, inviteToken, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.register(accountName.trim());
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not create account.');
      setLoading(false);
    }
  }

  if (inviteToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center space-y-4">
          {loading ? (
            <>
              <div className="text-4xl">🎉</div>
              <h1 className="text-xl font-bold text-gray-900">Accepting invitation…</h1>
              <p className="text-sm text-gray-500">Please wait while we set up your account.</p>
            </>
          ) : error ? (
            <>
              <div className="text-4xl">❌</div>
              <h1 className="text-xl font-bold text-gray-900">Invitation Failed</h1>
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => router.replace('/sign-in')}>
                Back to sign in
              </Button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page p-4">
      <div className="absolute left-1/2 top-0 h-40 w-[80vw] -translate-x-1/2 -skew-y-3 bg-brand/5" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_24px_70px_rgba(25,28,36,.10)] sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-md">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-ink">SHIPNOW</span>
        </div>

        <div className="mb-6 space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[.14em] text-brand">New workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Set up your workspace</h1>
          <p className="mt-1 text-sm text-ink-muted">Give your logistics company a name to get started.</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Company name"
            placeholder="e.g. Acme Logistics"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading || !accountName.trim()}
            className="flex h-11 w-full items-center justify-center rounded-[10px] bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? 'Creating workspace…' : 'Create workspace →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <OnboardingContent />
    </Suspense>
  );
}
