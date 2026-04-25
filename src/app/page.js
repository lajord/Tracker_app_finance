'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BudgetProgress } from '@/components/BudgetProgress';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CapitalEvolutionChart } from '@/components/charts/CapitalEvolutionChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { useFinanceStore } from '@/lib/store';
import {
  computeRangeStats,
  filterByRange,
  computeBudgetStatus,
  computeTotalCapital,
  formatCurrency,
} from '@/lib/finance';

export default function DashboardPage() {
  const { transactions, budgets, accounts, investments } = useFinanceStore();
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));

  const daysDiff = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return differenceInDays(end, start);
  }, [startDate, endDate]);

  const isMultiMonth = daysDiff > 31;
  const monthsCount = Math.max(1, Math.round(daysDiff / 30));

  const filteredTxs = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter((transaction) => transaction.account_id === selectedAccountId);
  }, [transactions, selectedAccountId]);

  const targetAccounts = useMemo(() => {
    return selectedAccountId === 'all'
      ? accounts || []
      : accounts?.filter((account) => account.id === selectedAccountId) || [];
  }, [accounts, selectedAccountId]);

  const targetInvestments = useMemo(() => {
    if (selectedAccountId === 'all') return investments || [];
    const selectedAccount = accounts?.find((account) => account.id === selectedAccountId);
    if (!selectedAccount || selectedAccount.type !== 'investment') return [];
    return (investments || []).filter((investment) => investment.platform === selectedAccount.name);
  }, [investments, accounts, selectedAccountId]);

  const stats = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { income: 0, expenses: 0, net: 0, savingsRate: 0 };
    }
    return computeRangeStats(filteredTxs, start, end);
  }, [filteredTxs, startDate, endDate]);

  const totalCapitalData = useMemo(
    () => computeTotalCapital(targetAccounts, targetInvestments, filteredTxs),
    [targetAccounts, targetInvestments, filteredTxs]
  );

  const budgetStatus = useMemo(
    () => computeBudgetStatus(filteredTxs, budgets),
    [filteredTxs, budgets]
  );

  const recent = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    return filterByRange(filteredTxs, start, end)
      .sort((left, right) => (left.date < right.date ? 1 : -1))
      .slice(0, 6);
  }, [filteredTxs, startDate, endDate]);

  const alerts = budgetStatus.filter((budget) => budget.status === 'danger' || budget.status === 'over');
  const avgPerMonth = {
    income: stats.income / monthsCount,
    expenses: stats.expenses / monthsCount,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-base font-medium capitalize text-zinc-300 sm:text-lg">
            {isMultiMonth ? 'Periode selectionnee - vue agregee' : format(new Date(startDate), 'MMMM yyyy', { locale: fr })}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
          <DateRangePicker
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
          <Link href="/transactions" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">
              Ajouter une transaction
            </Button>
          </Link>
        </div>
      </div>

      <div className="w-full sm:max-w-xs">
        <Select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="bg-zinc-900 text-sm"
        >
          <option value="all">Tous les comptes</option>
          {accounts?.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-amber-200">
                {alerts.length} budget{alerts.length > 1 ? 's' : ''} a surveiller
              </div>
              <div className="mt-1 text-xs text-amber-300/80">
                {alerts
                  .slice(0, 3)
                  .map((alert) => `${alert.category.name} (${alert.percent.toFixed(0)}%)`)
                  .join(' - ')}
              </div>
            </div>
            <Link href="/budgets" className="text-sm font-medium text-amber-200 hover:underline">
              Voir les budgets
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label={selectedAccountId === 'all' ? 'Capital total' : 'Solde actuel'}
          value={formatCurrency(totalCapitalData.total)}
          accent="text-indigo-400"
        />
        <KpiCard
          label={isMultiMonth ? 'Revenus de la periode' : 'Revenus du mois'}
          value={formatCurrency(stats.income)}
          accent="text-emerald-400"
          hint={isMultiMonth ? `~ ${formatCurrency(avgPerMonth.income)} / mois` : undefined}
        />
        <KpiCard
          label={isMultiMonth ? 'Depenses de la periode' : 'Depenses du mois'}
          value={formatCurrency(stats.expenses)}
          accent="text-red-400"
          hint={isMultiMonth ? `~ ${formatCurrency(avgPerMonth.expenses)} / mois` : undefined}
        />
        <Card className="border-blue-500/30 bg-blue-900/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-200/80">Reste a vivre</div>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(stats.net)}</div>
          </div>
        </Card>
        <KpiCard
          label="Taux d'epargne"
          value={`${stats.savingsRate.toFixed(0)}%`}
          accent={stats.savingsRate >= 20 ? 'text-emerald-400' : 'text-amber-400'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader title="Croissance du capital" subtitle="Vue consolidee sur la periode" />
          <CapitalEvolutionChart
            accounts={targetAccounts}
            investments={targetInvestments}
            transactions={filteredTxs}
            startDate={startDate}
            endDate={endDate}
          />
        </Card>
        <Card>
          <CardHeader title="Depenses par categorie" titleClassName="text-lg font-bold text-red-400" />
          <CategoryPieChart transactions={filteredTxs} type="expense" startDate={startDate} endDate={endDate} />
        </Card>
        <Card>
          <CardHeader title="Revenus par categorie" titleClassName="text-lg font-bold text-emerald-400" />
          <CategoryPieChart transactions={filteredTxs} type="income" startDate={startDate} endDate={endDate} />
        </Card>
      </div>

      <Card>
        <IncomeExpenseChart transactions={filteredTxs} startDate={startDate} endDate={endDate} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Budgets en cours"
            subtitle={`${budgetStatus.length} categorie(s)`}
            action={
              <Link href="/budgets">
                <Button size="sm" variant="ghost">
                  Gerer
                </Button>
              </Link>
            }
          />
          {budgetStatus.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">Aucun budget defini.</div>
          ) : (
            <div className="space-y-3">
              {budgetStatus.slice(0, 4).map((budget) => (
                <BudgetProgress key={budget.id} item={budget} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Dernieres transactions"
            subtitle={isMultiMonth ? 'Sur la periode' : 'Ce mois-ci'}
            action={
              <Link href="/transactions">
                <Button size="sm" variant="ghost">
                  Tout voir
                </Button>
              </Link>
            }
          />
          {recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">Aucune transaction sur cette periode.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {recent.map((tx) => {
                const categoryName = tx.category || 'Standard';
                const account = accounts?.find((item) => item.id === tx.account_id);

                return (
                  <div key={tx.id} className="flex items-start gap-3 py-3 sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-zinc-800/80 text-sm shadow-inner">
                        <CategoryIcon category={categoryName} amount={tx.amount} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-100">{tx.label}</div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {format(parseISO(tx.date), 'd MMM', { locale: fr })} - {categoryName} - {account?.name || 'Sans compte'}
                        </div>
                      </div>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount >= 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, diff, diffInvert, hint }) {
  const showDiff = typeof diff === 'number' && !Number.isNaN(diff);
  const isPositive = diffInvert ? diff < 0 : diff > 0;

  return (
    <Card>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
        {showDiff && (
          <div className={`mt-2 text-[11px] font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {diff >= 0 ? '+' : ''}
            {formatCurrency(diff)} vs mois precedent
          </div>
        )}
        {hint && !showDiff && <div className="mt-2 text-[11px] font-medium text-zinc-500">{hint}</div>}
      </div>
    </Card>
  );
}
