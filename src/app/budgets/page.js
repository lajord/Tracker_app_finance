'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BudgetProgress } from '@/components/BudgetProgress';
import { useFinanceStore } from '@/lib/store';
import { computeBudgetStatus, formatCurrency } from '@/lib/finance';
import { BASELINE_CATEGORIES } from '@/lib/constants';

export default function BudgetsPage() {
  const { transactions, budgets, upsertBudget, deleteBudget } = useFinanceStore();
  const [catName, setCatName] = useState('');
  const [limit, setLimit] = useState('');

  const availableCats = useMemo(() => {
    const historical = transactions.map((transaction) => transaction.category).filter(Boolean);
    return Array.from(new Set([...BASELINE_CATEGORIES, ...historical]));
  }, [transactions]);

  const status = useMemo(
    () => computeBudgetStatus(transactions, budgets),
    [transactions, budgets]
  );

  const totals = useMemo(() => {
    const limitTotal = status.reduce((sum, item) => sum + item.limit, 0);
    const spentTotal = status.reduce((sum, item) => sum + item.spent, 0);
    return { limitTotal, spentTotal };
  }, [status]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!catName || !limit) return;

    await upsertBudget({
      category: catName,
      amount_limit: Number(limit),
    });

    setCatName('');
    setLimit('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Budgets</h1>
        <p className="text-sm text-zinc-400">Definis des plafonds mensuels et suis tes depenses en temps reel</p>
      </div>

      <Card>
        <CardHeader
          title="Progression globale"
          subtitle={`${formatCurrency(totals.spentTotal)} depenses sur ${formatCurrency(totals.limitTotal)}`}
        />
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all"
            style={{
              width: `${Math.min(totals.limitTotal > 0 ? (totals.spentTotal / totals.limitTotal) * 100 : 0, 100)}%`,
            }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:justify-between">
          <span>
            {totals.limitTotal > 0 ? `${((totals.spentTotal / totals.limitTotal) * 100).toFixed(0)}%` : '0%'} du budget
          </span>
          <span>{formatCurrency(Math.max(0, totals.limitTotal - totals.spentTotal))} restants</span>
        </div>
      </Card>

      <Card>
        <CardHeader title="Nouveau budget" subtitle="Mois en cours" />
        <form onSubmit={handleAdd} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <input
              list="budget-cats"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Nom de la categorie..."
              className="min-h-11 block w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <datalist id="budget-cats">
              {availableCats.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <Input
            type="number"
            step="1"
            min="0"
            placeholder="Plafond EUR"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <Button type="submit" className="w-full lg:w-auto">
            Ajouter
          </Button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {status.length === 0 ? (
          <Card className="sm:col-span-2">
            <div className="py-8 text-center text-sm text-zinc-500">
              Aucun budget defini. Commence par en creer un ci-dessus.
            </div>
          </Card>
        ) : (
          status.map((budget) => <BudgetProgress key={budget.id} item={budget} onDelete={deleteBudget} />)
        )}
      </div>
    </div>
  );
}
