'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Target,
  RefreshCw,
} from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', shortLabel: 'Accueil', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', shortLabel: 'Tx', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Comptes', shortLabel: 'Comptes', icon: Wallet },
  { href: '/investments', label: 'Investissements', shortLabel: 'Invest', icon: TrendingUp },
  { href: '/budgets', label: 'Budgets', shortLabel: 'Budgets', icon: Target },
  { href: '/subscriptions', label: 'Abonnements', shortLabel: 'Abos', icon: RefreshCw },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-zinc-950/80 backdrop-blur lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          T
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Tracker</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Finance App</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="rounded-xl bg-zinc-900/80 p-3">
          <div className="text-[11px] text-zinc-500">Mode demo</div>
          <div className="mt-0.5 text-xs text-zinc-300">
            Connectez Supabase via <code className="text-indigo-400">.env.local</code>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-zinc-950/95 backdrop-blur lg:hidden">
      <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {nav.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
