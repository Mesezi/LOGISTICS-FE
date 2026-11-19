'use client';

import { useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Users, ScrollText, Mail, Check, Pencil, UserRound, Eye, EyeOff, Camera } from 'lucide-react';
import { authApi, accountsApi, auditApi } from '@/lib/api';
import { fmtDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUIStore } from '@/store/ui';

const TABS = ['Account', 'Profile', 'Audit Log'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Account');
  const settingsTabRequest = useUIStore((state) => state.settingsTabRequest);
  const clearSettingsTabRequest = useUIStore((state) => state.clearSettingsTabRequest);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => authApi.me() });
  const isAdmin = me?.role === 'admin';
  const activeTab = settingsTabRequest ?? tab;

  const tabIcons: Record<Tab, React.ReactNode> = {
    'Account':   <Settings   size={15} strokeWidth={1.75} />,
    'Profile':   <UserRound  size={15} strokeWidth={1.75} />,
    // 'Team':      <Users      size={15} strokeWidth={1.75} />,
    'Audit Log': <ScrollText size={15} strokeWidth={1.75} />,
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[.14em] text-brand">
          {me?.account.name ?? 'BluSync'} / Workspace
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Settings</h1>
      </div>

      {/* Tab selector */}
      <div className="-mx-4 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0">
        <div className="flex w-fit gap-1 rounded-xl border border-border bg-card p-1">
          {TABS.filter((t) => t !== 'Audit Log' || isAdmin).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                clearSettingsTabRequest();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                activeTab === t
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tabIcons[t]}
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Account'   && <AccountTab key={me?.account.name} initialName={me?.account.name ?? ''} />}
      {activeTab === 'Profile'   && <ProfileTab />}
      {/* {tab === 'Team'      && isAdmin && <TeamTab />} */}
      {activeTab === 'Audit Log' && isAdmin && <AuditLogTab />}
    </div>
  );
}

/* ── Account ──────────────────────────────────────────────────────────────── */
function AccountTab({ initialName }: { initialName: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => accountsApi.update({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="max-w-md space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-alt">
          <Pencil size={15} strokeWidth={1.75} className="text-brand" />
        </div>
        <h2 className="text-base font-semibold text-ink">Company Details</h2>
      </div>

      <Input
        label="Company Name"
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <Button
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
          disabled={!name.trim()}
          size="sm"
        >
          Save Changes
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-success-text">
            <Check size={14} strokeWidth={2} /> Saved
          </span>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-loss">
          {(mutation.error as any)?.response?.data?.message ?? 'Error saving.'}
        </p>
      )}
    </div>
  );
}

/* ── Profile ──────────────────────────────────────────────────────────────── */
function ProfileTab() {
  const { user, isLoaded } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [nameSaved,    setNameSaved]    = useState(false);
  const [nameError,    setNameError]    = useState('');
  const [namePending,  setNamePending]  = useState(false);

  const [imgPending,   setImgPending]   = useState(false);
  const [imgError,     setImgError]     = useState('');
  const [imgSaved,     setImgSaved]     = useState(false);

  const [currentPw,   setCurrentPw]    = useState('');
  const [newPw,       setNewPw]        = useState('');
  const [confirmPw,   setConfirmPw]    = useState('');
  const [pwSaved,     setPwSaved]      = useState(false);
  const [pwError,     setPwError]      = useState('');
  const [pwPending,   setPwPending]    = useState(false);
  const [showCurrent, setShowCurrent]  = useState(false);
  const [showNew,     setShowNew]      = useState(false);

  if (!isLoaded) {
    return (
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Skeleton className="h-64 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || '—';
  const email       = user?.primaryEmailAddress?.emailAddress ?? '—';
  const initials    = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || email[0].toUpperCase();

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImgPending(true);
    setImgError('');
    try {
      await user.setProfileImage({ file });
      setImgSaved(true);
      setTimeout(() => setImgSaved(false), 2500);
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setImgError(msg ?? 'Could not upload image.');
    } finally {
      setImgPending(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setNamePending(true);
    setNameError('');
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setNameError(msg ?? 'Could not update name.');
    } finally {
      setNamePending(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw.length < 8)    { setPwError('Password must be at least 8 characters.'); return; }
    setPwPending(true);
    setPwError('');
    try {
      await user.updatePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwSaved(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setPwError(msg ?? 'Could not update password.');
    } finally {
      setPwPending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

      {/* ── Left: avatar card ── */}
      <div className="h-fit rounded-xl border border-border bg-card p-6 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand ring-2 ring-border">
                {initials}
              </div>
            )}
            {/* Upload overlay */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imgPending}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-ink-dark text-white shadow transition-colors hover:bg-ink disabled:opacity-50"
              aria-label="Change profile photo"
            >
              {imgPending
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Camera size={14} strokeWidth={1.75} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-ink">{displayName}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{email}</p>
          </div>

          {imgError && <p className="text-center text-xs text-loss">{imgError}</p>}
          {imgSaved && (
            <span className="flex items-center gap-1 text-xs font-medium text-success-text">
              <Check size={12} strokeWidth={2.5} /> Photo updated
            </span>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imgPending}
            className="w-full rounded-lg border border-border bg-page py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-ink-grey hover:text-ink disabled:opacity-50"
          >
            {imgPending ? 'Uploading…' : 'Change photo'}
          </button>
        </div>
      </div>

      {/* ── Right: forms ── */}
      <div className="space-y-4">

        {/* Update name */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card-alt">
              <Pencil size={13} strokeWidth={1.75} className="text-brand" />
            </div>
            <h2 className="text-sm font-semibold text-ink">Display name</h2>
          </div>
          <form onSubmit={saveName} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                placeholder={user?.firstName ?? 'First'}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last name"
                placeholder={user?.lastName ?? 'Last'}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            {nameError && <p className="text-xs text-loss">{nameError}</p>}
            <div className="flex items-center gap-3">
              <Button size="sm" type="submit" loading={namePending} disabled={!firstName.trim() && !lastName.trim()}>
                Update name
              </Button>
              {nameSaved && (
                <span className="flex items-center gap-1 text-sm font-medium text-success-text">
                  <Check size={14} strokeWidth={2} /> Saved
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card-alt">
              <Eye size={13} strokeWidth={1.75} className="text-brand" />
            </div>
            <h2 className="text-sm font-semibold text-ink">Change password</h2>
          </div>
          <form onSubmit={savePassword} className="space-y-3">
            <div className="relative">
              <Input
                label="Current password"
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-8.5 text-ink-grey hover:text-ink"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
            <div className="relative">
              <Input
                label="New password"
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-8.5 text-ink-grey hover:text-ink"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
            <Input
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
            {pwError && <p className="text-xs text-loss">{pwError}</p>}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                type="submit"
                loading={pwPending}
                disabled={!currentPw || !newPw || !confirmPw}
              >
                Change password
              </Button>
              {pwSaved && (
                <span className="flex items-center gap-1 text-sm font-medium text-success-text">
                  <Check size={14} strokeWidth={2} /> Updated
                </span>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

/* ── Team ─────────────────────────────────────────────────────────────────── */
function TeamTab() {
  const [email, setEmail] = useState('');
  const [role,  setRole]  = useState<'staff' | 'admin'>('staff');
  const [sent,  setSent]  = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.invite(email, role),
    onSuccess: () => {
      setSent(true);
      setEmail('');
      setTimeout(() => setSent(false), 3500);
    },
  });

  return (
    <div className="max-w-md space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-alt">
          <Mail size={15} strokeWidth={1.75} className="text-brand" />
        </div>
        <h2 className="text-base font-semibold text-ink">Invite Team Member</h2>
      </div>

      <p className="text-sm text-ink-muted">
        Send an invitation to a new staff member or admin.
      </p>

      <Input
        label="Email address"
        type="email"
        placeholder="staff@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium text-ink-muted">Role</label>
        <div className="flex gap-3">
          {(['staff', 'admin'] as const).map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="accent-brand"
              />
              <span className="text-sm capitalize font-medium text-ink">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
          disabled={!email.trim()}
          size="sm"
          icon={<Mail size={15} strokeWidth={1.75} />}
        >
          Send Invitation
        </Button>
        {sent && (
          <span className="flex items-center gap-1 text-sm font-medium text-success-text">
            <Check size={14} strokeWidth={2} /> Invitation created
          </span>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-loss">
          {(mutation.error as any)?.response?.data?.message ?? 'Error sending invitation.'}
        </p>
      )}

      <div className="rounded-lg border border-debt-bg bg-debt-bg px-4 py-3 text-xs text-debt">
        Note: Email delivery is not yet wired up. The invitation record will be created but no email is sent.
      </div>
    </div>
  );
}

/* ── Audit Log ────────────────────────────────────────────────────────────── */
function AuditLogTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditApi.list({ page, limit: 20 }),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-alt">
          <ScrollText size={15} strokeWidth={1.75} className="text-brand" />
        </div>
        <h2 className="text-base font-semibold text-ink">Audit Log</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y divide-border">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">No audit records found.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="px-4 py-3 space-y-2">
                {/* Top line */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink">{r.user?.name ?? '—'}</span>
                    <span className="chip-pink inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize">
                      {r.action}
                    </span>
                    <span className="rounded-full bg-page px-2 py-0.5 text-xs text-ink-muted border border-border">
                      {r.table_name} #{r.record_id}
                    </span>
                  </div>
                  <span className="text-xs text-ink-muted tabular">{fmtDateTime(r.created_at)}</span>
                </div>

                {/* Diff */}
                {(r.before || r.after) && (
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-brand font-medium hover:underline">
                      View changes
                    </summary>
                    <div className="mt-2 space-y-1 rounded-lg bg-page p-3 font-mono text-[11px]">
                      {r.before && (
                        <div>
                          <span className="text-loss font-semibold">− Before: </span>
                          <span className="text-ink-muted">{JSON.stringify(r.before)}</span>
                        </div>
                      )}
                      {r.after && (
                        <div>
                          <span className="text-success-text font-semibold">+ After: </span>
                          <span className="text-ink">{JSON.stringify(r.after)}</span>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {meta && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          hasNext={meta.hasNextPage}
          hasPrev={meta.hasPreviousPage}
          onNext={() => setPage((p) => p + 1)}
          onPrev={() => setPage((p) => p - 1)}
        />
      )}
    </div>
  );
}
