'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useFinanceStore } from '@/lib/store';
import { computeAccountBalances, formatCurrency } from '@/lib/finance';

export default function AccountsPage() {
  const { accounts, transactions, investments } = useFinanceStore();

  const balances = useMemo(
    () => computeAccountBalances(accounts, transactions),
    [accounts, transactions]
  );
  
  const getInvestedForPlatform = (platformName) => {
    if (!platformName || !investments) return 0;
    return investments
      .filter(inv => (inv.platform || '').toLowerCase().includes(platformName.toLowerCase()))
      .reduce((sum, inv) => sum + Number(inv.invested_amount || 0), 0);
  };

  const totalInvestedGlobal = investments?.reduce((sum, i) => sum + Number(i.invested_amount || 0), 0) || 0;
  const total = balances.reduce((sum, a) => sum + a.balance, 0) + totalInvestedGlobal;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="p-8 text-zinc-500 animate-pulse">Chargement des comptes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Comptes & Patrimoine</h1>
          <p className="text-sm text-zinc-400">Total de vos comptes et avoirs</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-indigo-400">{formatCurrency(total)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {balances.map(acc => (
          <Card key={acc.id} className="flex flex-col justify-between p-6">
            <div>
              <div className="text-lg font-semibold text-white">{acc.name}</div>
            </div>
            <div className="mt-6 text-3xl font-bold text-white">
              {formatCurrency(acc.type === 'investment' ? acc.balance + getInvestedForPlatform(acc.name) : acc.balance)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
