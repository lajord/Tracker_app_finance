'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { BudgetProgress } from '@/components/BudgetProgress';
import { useFinanceStore } from '@/lib/store';
import { computeBudgetStatus, formatCurrency } from '@/lib/finance';
import { BASELINE_CATEGORIES } from '@/lib/constants';

export default function BudgetsPage() {
  const { transactions, budgets, upsertBudget, deleteBudget } =
    useFinanceStore();

  const [catName, setCatName] = useState('');
  const [limit, setLimit] = useState('');

  const availableCats = useMemo(() => {
    const historical = transactions.map((t) => t.category).filter(Boolean);
    return Array.from(new Set([...BASELINE_CATEGORIES, ...historical]));
  }, [transactions]);

  const status = useMemo(
    () => computeBudgetStatus(transactions, budgets),
    [transactions, budgets]
  );

  const totals = useMemo(() => {
    const limitTotal = status.reduce((a, b) => a + b.limit, 0);
    const spentTotal = status.reduce((a, b) => a + b.spent, 0);
    return { limitTotal, spentTotal };
  }, [status]);

  const now = new Date();

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
        <p className="text-sm text-zinc-400">
          Définis des plafonds mensuels et suis tes dépenses en temps réel
        </p>
      </div>

      {/* Global progression */}
      <Card>
        <CardHeader
          title="Progression globale"
          subtitle={`${formatCurrency(totals.spentTotal)} dépensés sur ${formatCurrency(totals.limitTotal)}`}
        />
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all"
            style={{
              width: `${Math.min(
                totals.limitTotal > 0 ? (totals.spentTotal / totals.limitTotal) * 100 : 0,
                100
              )}%`,
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span>
            {totals.limitTotal > 0
              ? `${((totals.spentTotal / totals.limitTotal) * 100).toFixed(0)}%`
              : '0%'}{' '}
            du budget global
          </span>
          <span>
            {formatCurrency(Math.max(0, totals.limitTotal - totals.spentTotal))} restants
          </span>
        </div>
      </Card>

      {/* Add budget form */}
      <Card>
        <CardHeader title="Nouveau budget" subtitle="Mois en cours" />
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            list="budget-cats"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Nom de la catégorie..."
            className="block w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <datalist id="budget-cats">
            {availableCats.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Input
            type="number"
            step="1"
            min="0"
            placeholder="Plafond €"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <Button type="submit">Ajouter</Button>
        </form>
      </Card>

      {/* Budgets list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {status.length === 0 ? (
          <Card className="sm:col-span-2">
            <div className="py-8 text-center text-sm text-zinc-500">
              Aucun budget défini. Commence par en créer un ci-dessus.
            </div>
          </Card>
        ) : (
          status.map((b) => <BudgetProgress key={b.id} item={b} onDelete={deleteBudget} />)
        )}
      </div>
    </div>
  );
}
