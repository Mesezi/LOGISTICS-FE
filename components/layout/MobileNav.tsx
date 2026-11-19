'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Briefcase, Receipt, Users, ChartColumn } from 'lucide-react';
import { cls } from '@/lib/utils';

const tabs = [
  { href: '/dashboard', label: 'Home',     icon: House       },
  { href: '/jobs',      label: 'Jobs',     icon: Briefcase   },
  { href: '/expenses',  label: 'Expenses', icon: Receipt     },
  { href: '/directory', label: 'People',   icon: Users       },
  { href: '/reports',   label: 'Reports',  icon: ChartColumn },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 flex border-t border-border/90 bg-card/95 backdrop-blur-lg shadow-[0_-4px_18px_rgba(0,0,0,.04)] lg:hidden safe-area-inset-bottom">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cls(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-sm font-semibold transition-colors',
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
    </nav>
  );
}
