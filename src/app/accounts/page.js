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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Comptes & Patrimoine</h1>
          <p className="text-sm text-zinc-400">Total de vos comptes et avoirs</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-indigo-400">{formatCurrency(wealth.total)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {wealth.accounts.map((acc) => (
          <Card key={acc.id} className="flex flex-col justify-between p-6">
            <div>
              <div className="text-lg font-semibold text-white">{acc.name}</div>
            </div>
            <div className="mt-6 text-3xl font-bold text-white">
              {formatCurrency(acc.total)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
