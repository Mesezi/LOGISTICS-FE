'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  House, Briefcase, Receipt, Users, Truck,
  ChartColumn, Settings, ChevronUp, ChevronDown, LogOut, UserRound,
} from 'lucide-react';
import { cls } from '@/lib/utils';
import { authApi } from '@/lib/api';
import { useUIStore } from '@/store/ui';

const nav = [
  { href: '/dashboard',  label: 'Home',      icon: House        },
  { href: '/jobs',       label: 'Jobs',       icon: Briefcase    },
  { href: '/expenses',   label: 'Expenses',   icon: Receipt      },
  { href: '/directory',  label: 'Directory',  icon: Users        },
  { href: '/reports',    label: 'Reports',    icon: ChartColumn  },
  { href: '/settings',   label: 'Settings',   icon: Settings     },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { data: appUser } = useQuery({ queryKey: ['me'], queryFn: () => authApi.me() });
  const { signOut } = useClerk();
  const requestSettingsTab = useUIStore((state) => state.requestSettingsTab);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Your account';
  const accountName = appUser?.account.name || 'SHIPNOW';
  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = displayName.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  const imageUrl = user?.imageUrl;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <aside className="flex h-full w-[224px] flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-[68px] items-center gap-3 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand shadow-sm">
          <Truck size={17} strokeWidth={2} className="text-white" />
        </div>
        <span className="min-w-0 flex-1 truncate text-[17px] font-bold text-ink tracking-tight">{accountName}</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cls(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150',
                active
                  ? 'bg-card-alt text-brand shadow-[inset_2px_0_0_var(--brand)]'
                  : 'text-ink-muted hover:bg-page hover:text-ink',
              )}
            >
              <Icon
                size={18}
                strokeWidth={1.75}
                className={active ? 'text-brand' : 'text-ink-grey'}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-xl bg-ink-dark p-3.5 text-white">
        <p className="text-xs font-semibold">Moving every day</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/65">Keep your dispatch team and deliveries in sync.</p>
        <Link href="/reports" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:text-white/80">
          View reports <ChartColumn size={12} />
        </Link>
      </div>

      {/* User */}
      <div ref={accountRef} className="relative border-t border-border p-3">
        {accountOpen && (
          <div id="account-menu" role="menu" aria-label="Account menu" className="absolute bottom-[calc(100%+10px)] left-3 right-3 z-50 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-[0_16px_44px_rgba(22,34,51,.16)]">
            <div className="flex items-center gap-3 rounded-lg bg-page/70 p-3">
              <UserAvatar src={imageUrl} alt={displayName} initials={initials} size={40} className="h-10 w-10 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{isLoaded ? displayName : 'Loading account…'}</p>
                {email && <p className="mt-0.5 truncate text-[11px] text-ink-muted">{email}</p>}
              </div>
            </div>
            <Link role="menuitem" href="/settings" onClick={() => { setAccountOpen(false); requestSettingsTab('Profile'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-ink-muted transition hover:bg-page hover:text-ink">
              <UserRound size={15} /> Profile & security
            </Link>
            <button role="menuitem" type="button" onClick={() => signOut({ redirectUrl: '/sign-in' })} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-loss transition hover:bg-loss-bg">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
        <button type="button" aria-haspopup="menu" aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountOpen((open) => !open)} className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-page">
          <UserAvatar src={imageUrl} alt={displayName} initials={initials} size={36} className="h-9 w-9 text-xs ring-2 ring-white" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-ink">{isLoaded ? displayName : 'Your account'}</span>
            <span className="block truncate text-sm text-ink-muted">{accountName}</span>
          </span>
          {accountOpen ? <ChevronDown size={15} className="text-ink-grey" /> : <ChevronUp size={15} className="text-ink-grey transition group-hover:text-ink" />}
        </button>
      </div>
    </aside>
  );
}

function UserAvatar({
  src,
  alt,
  initials,
  size,
  className,
}: {
  src?: string;
  alt: string;
  initials: string;
  size: number;
  className: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageFailed = src !== undefined && failedSrc === src;

  return (
    <span className={cls(
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-alt font-semibold text-brand',
      className,
    )}>
      {src && !imageFailed ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : initials}
    </span>
  );
}
