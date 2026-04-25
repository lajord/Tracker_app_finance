'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { useFinanceStore } from '@/lib/store';
import { computeAccountWealth, formatCurrency } from '@/lib/finance';

export default function AccountsPage() {
  const { accounts, transactions, investments } = useFinanceStore();

  const wealth = useMemo(
    () => computeAccountWealth(accounts, investments, transactions),
    [accounts, investments, transactions]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Comptes et patrimoine</h1>
          <p className="text-sm text-zinc-400">Total de vos comptes et avoirs</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-3xl font-bold text-indigo-400">{formatCurrency(wealth.total)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {wealth.accounts.map((account) => (
          <Card key={account.id} className="flex flex-col justify-between">
            <div className="text-lg font-semibold text-white">{account.name}</div>
            <div className="mt-5 text-3xl font-bold text-white">{formatCurrency(account.total)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
