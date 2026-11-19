'use client';

import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.'),
  lastName: z.string().trim().min(1, 'Enter your last name.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const verificationSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type VerificationValues = z.infer<typeof verificationSchema>;

export default function SignUpPage() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur',
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });
  const verificationForm = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    mode: 'onBlur',
    defaultValues: { code: '' },
  });

  const busy = loading || fetchStatus === 'fetching';

  async function handleSignUp({ email, password, firstName, lastName }: SignUpValues) {
    if (!signUp) return;
    setLoading(true);
    setError('');

    const { error: createError } = await signUp.password({
      emailAddress: email,
      password,
      firstName,
      lastName,
    });
    if (createError) {
      setError(createError.message ?? 'Unable to create account.');
      setLoading(false);
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      setError(sendError.message ?? 'Could not send verification email.');
      setLoading(false);
      return;
    }

    setStep('verify');
    setLoading(false);
  }

  async function handleVerify({ code }: VerificationValues) {
    if (!signUp) return;
    setLoading(true);
    setError('');

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
    if (verifyError) {
      setError(verifyError.message ?? 'Verification failed.');
      setLoading(false);
      return;
    }

    const { error: finalizeError } = await signUp.finalize({
      navigate: async ({ decorateUrl }) => {
        const dest = decorateUrl('/');
        if (dest.startsWith('http')) {
          window.location.href = dest;
        } else {
          router.push(dest);
        }
      },
    });
    if (finalizeError) setError(finalizeError.message ?? 'Could not complete sign-up.');
    setLoading(false);
  }

  async function handleGoogle() {
    if (!signUp) return;
    setError('');
    const { error: ssoError } = await signUp.sso({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectCallbackUrl: '/sign-up',
    });
    if (ssoError) setError(ssoError.message ?? 'Google sign-up failed.');
  }

  /* â”€â”€ Verify screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-card-alt text-2xl text-brand">
            <Mail size={20} strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold text-ink">Check your inbox</h1>
          <p className="mt-1 text-sm text-ink-muted">
            We sent a 6-digit code to <span className="font-semibold text-ink">{signUpForm.getValues('email')}</span>
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={verificationForm.handleSubmit(handleVerify)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-semibold text-ink">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="6-digit code"
              aria-invalid={!!verificationForm.formState.errors.code}
              {...verificationForm.register('code')}
              className={`${inputCls} text-center text-xl font-bold tracking-[0.5em]`}
            />
            {verificationForm.formState.errors.code && (
              <p role="alert" className="mt-1.5 text-xs text-loss">{verificationForm.formState.errors.code.message}</p>
            )}
          </div>
          <PrimaryButton loading={busy} label="Verify & continue" loadingLabel="Verifying..." />
        </form>

        <button
          type="button"
          onClick={() => { setStep('register'); setError(''); verificationForm.reset(); }}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft />
          Back
        </button>
      </div>
    );
  }

  /* â”€â”€ Register screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">Join your team and start dispatching smarter</p>
      </div>

      {error && <ErrorBanner message={error} />}

      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-brand/40 hover:shadow-md active:scale-[0.99]"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/70" />
        <span className="text-xs font-medium text-ink-grey">or sign up with email</span>
        <div className="h-px flex-1 bg-border/70" />
      </div>

      <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="mb-1.5 block text-sm font-semibold text-ink">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Jane"
              aria-invalid={!!signUpForm.formState.errors.firstName}
              {...signUpForm.register('firstName')}
              className={inputCls}
            />
            {signUpForm.formState.errors.firstName && (
              <p role="alert" className="mt-1.5 text-xs text-loss">{signUpForm.formState.errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1.5 block text-sm font-semibold text-ink">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Doe"
              aria-invalid={!!signUpForm.formState.errors.lastName}
              {...signUpForm.register('lastName')}
              className={inputCls}
            />
            {signUpForm.formState.errors.lastName && (
              <p role="alert" className="mt-1.5 text-xs text-loss">{signUpForm.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
            Email address
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-grey">
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
              aria-invalid={!!signUpForm.formState.errors.email}
              {...signUpForm.register('email')}
              className={`${inputCls} pl-10`}
            />
          </div>
          {signUpForm.formState.errors.email && (
            <p role="alert" className="mt-1.5 text-xs text-loss">{signUpForm.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-grey">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              aria-invalid={!!signUpForm.formState.errors.password}
              {...signUpForm.register('password')}
              className={`${inputCls} pl-10 pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3.5 flex items-center text-ink-grey transition-colors hover:text-ink-muted"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {signUpForm.formState.errors.password && (
            <p role="alert" className="mt-1.5 text-xs text-loss">{signUpForm.formState.errors.password.message}</p>
          )}
        </div>

        <PrimaryButton loading={busy} label="Create account" loadingLabel="Creating account..." />
      </form>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-brand transition-colors hover:text-brand-dark">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* â”€â”€ Shared â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
