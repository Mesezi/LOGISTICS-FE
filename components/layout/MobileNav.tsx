'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { House, Briefcase, Receipt, Users, ChartColumn, MoreHorizontal, Settings, UserRound } from 'lucide-react';
import { cls } from '@/lib/utils';
import { useUIStore } from '@/store/ui';

const tabs = [
  { href: '/dashboard', label: 'Home',     icon: House       },
  { href: '/jobs',      label: 'Jobs',     icon: Briefcase   },
  { href: '/expenses',  label: 'Expenses', icon: Receipt     },
  { href: '/directory', label: 'People',   icon: Users       },
  { href: '/reports',   label: 'Reports',  icon: ChartColumn },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const requestSettingsTab = useUIStore((state) => state.requestSettingsTab);
  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/');

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 flex border-t border-border/90 bg-card/95 backdrop-blur-lg shadow-[0_-4px_18px_rgba(0,0,0,.04)] lg:hidden safe-area-inset-bottom">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cls(
              'flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
              active ? 'text-brand' : 'text-ink-muted',
            )}
          >
            <Icon
              size={20}
              strokeWidth={1.75}
              className={active ? 'text-brand' : 'text-ink-grey'}
            />
            {label}
          </Link>
        );
      })}
      <div className="relative flex min-w-0 flex-1">
        {moreOpen && (
          <div
            role="menu"
            aria-label="More navigation"
            className="absolute bottom-[calc(100%+8px)] right-2 w-52 rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(22,34,51,.16)]"
          >
            <Link
              role="menuitem"
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className={cls(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
                settingsActive ? 'bg-card-alt text-brand' : 'text-ink-muted hover:bg-page hover:text-ink',
              )}
            >
              <Settings size={16} />
              Settings
            </Link>
            <Link
              role="menuitem"
              href="/settings"
              onClick={() => {
                requestSettingsTab('Profile');
                setMoreOpen(false);
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-page hover:text-ink"
            >
              <UserRound size={16} />
              Profile &amp; security
            </Link>
          </div>
        )}
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          className={cls(
            'flex w-full flex-col items-center py-2.5 text-[8px] font-semibold transition-colors',
            moreOpen || settingsActive ? 'text-brand' : 'text-ink-muted',
          )}
        >
          <MoreHorizontal
            size={20}
            strokeWidth={1.75}
            className={moreOpen || settingsActive ? 'text-brand' : 'text-ink-grey'}
          />
          More
        </button>
      </div>
    </nav>
  );
}
