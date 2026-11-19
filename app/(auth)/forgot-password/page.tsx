'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Step = 'request' | 'verify' | 'reset';

const requestSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

const verificationSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit reset code.'),
});

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type RequestValues = z.infer<typeof requestSchema>;
type VerificationValues = z.infer<typeof verificationSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });
  const verificationForm = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    mode: 'onBlur',
    defaultValues: { code: '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    mode: 'onBlur',
    defaultValues: { password: '' },
  });

  const busy = loading || fetchStatus === 'fetching';

  async function handleRequest({ email }: RequestValues) {
    if (!signIn) return;
    setLoading(true);
    setError('');

    // Create the sign-in first so Clerk knows which account to reset
    const { error: createError } = await signIn.create({ identifier: email });
    if (createError) {
      setError(createError.message ?? 'Could not find account.');
      setLoading(false);
      return;
    }

    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      setError(sendError.message ?? 'Could not send reset email.');
      setLoading(false);
      return;
    }

    setStep('verify');
    setLoading(false);
  }

  async function handleVerify({ code }: VerificationValues) {
    if (!signIn) return;
    setLoading(true);
    setError('');

    const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verifyError) {
      setError(verifyError.message ?? 'Invalid code.');
      setLoading(false);
      return;
    }

    setStep('reset');
    setLoading(false);
  }

  async function handleReset({ password }: ResetValues) {
    if (!signIn) return;
    setLoading(true);
    setError('');

    const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (submitError) {
      setError(submitError.message ?? 'Could not reset password.');
      setLoading(false);
      return;
    }

    const { error: finalError } = await signIn.finalize({
      navigate: async ({ decorateUrl }) => {
        const dest = decorateUrl('/');
        if (dest.startsWith('http')) {
          window.location.href = dest;
        } else {
          router.push(dest);
        }
      },
    });
    if (finalError) setError(finalError.message ?? 'Sign-in failed after reset.');
    setLoading(false);
  }

  /* ── Step indicators ────────────────────────────────── */
  const steps: { key: Step; label: string }[] = [
    { key: 'request', label: 'Email' },
    { key: 'verify', label: 'Verify' },
    { key: 'reset', label: 'Reset' },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      {/* Step dots */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < stepIndex
                  ? 'bg-brand text-white'
                  : i === stepIndex
                    ? 'bg-brand text-white shadow-sm shadow-red-100'
                    : 'bg-page text-ink-grey'
              }`}
            >
              {i < stepIndex ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${
                i <= stepIndex ? 'text-ink' : 'text-ink-grey'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-px w-6 ${i < stepIndex ? 'bg-brand/60' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Request ── */}
      {step === 'request' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email and we&apos;ll send a reset code
            </p>
          </div>

          {error && <ErrorBanner message={error} />}

          <form onSubmit={requestForm.handleSubmit(handleRequest)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-gray-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m2 7 10 7 10-7" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!requestForm.formState.errors.email}
                  {...requestForm.register('email')}
                  className={`${inputCls} pl-10`}
                />
              </div>
              {requestForm.formState.errors.email && (
                <p role="alert" className="mt-1.5 text-xs text-loss">{requestForm.formState.errors.email.message}</p>
              )}
            </div>
            <PrimaryButton loading={busy} label="Send reset code" loadingLabel="Sending…" />
          </form>

          <div className="text-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              <ChevronLeft />
              Back to sign in
            </Link>
          </div>
        </>
      )}

      {/* ── Verify ── */}
      {step === 'verify' && (
        <>
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-card-alt text-2xl text-brand">
              📧
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-1 text-sm text-gray-500">
              We sent a code to <span className="font-semibold text-gray-700">{requestForm.getValues('email')}</span>
            </p>
          </div>

          {error && <ErrorBanner message={error} />}

          <form onSubmit={verificationForm.handleSubmit(handleVerify)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Reset code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="· · · · · ·"
                aria-invalid={!!verificationForm.formState.errors.code}
                {...verificationForm.register('code')}
                className={`${inputCls} text-center text-xl font-bold tracking-[0.5em]`}
              />
              {verificationForm.formState.errors.code && (
                <p role="alert" className="mt-1.5 text-xs text-loss">{verificationForm.formState.errors.code.message}</p>
              )}
            </div>
            <PrimaryButton loading={busy} label="Verify code" loadingLabel="Verifying…" />
          </form>

          <button
            type="button"
            onClick={() => { setStep('request'); setError(''); verificationForm.reset(); }}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ChevronLeft />
            Try a different email
          </button>
        </>
      )}

      {/* ── Reset ── */}
      {step === 'reset' && (
        <>
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-2xl">
              🔑
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
            <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account</p>
          </div>

          {error && <ErrorBanner message={error} />}

          <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm font-semibold text-gray-700">
                New password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-gray-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  aria-invalid={!!resetForm.formState.errors.password}
                  {...resetForm.register('password')}
                  className={`${inputCls} pl-10 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 transition-colors hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {resetForm.formState.errors.password && (
                <p role="alert" className="mt-1.5 text-xs text-loss">{resetForm.formState.errors.password.message}</p>
              )}
            </div>
            <PrimaryButton loading={busy} label="Reset password & sign in" loadingLabel="Resetting…" />
          </form>
        </>
      )}
    </div>
  );
}

/* ── Shared primitives ──────────────────────────────────────────────────────── */

const inputCls =
  'w-full rounded-xl border border-border bg-page/70 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-grey focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10';

function PrimaryButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-100 transition hover:bg-brand-dark hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
    >
      {loading ? <><Spinner />{loadingLabel}</> : label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      <svg className="mt-px h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Eye() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" />
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
    </svg>
  );
}
