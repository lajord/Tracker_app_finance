'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CapitalEvolutionChart } from '@/components/charts/CapitalEvolutionChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { BudgetProgress } from '@/components/BudgetProgress';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Select } from '@/components/ui/Input';
import { useFinanceStore } from '@/lib/store';
import {
  PERIODS,
  computeMonthStats,
  computePeriodStats,
  computeRangeStats,
  computeCategoryBreakdown,
  filterByRange,
  computeBudgetStatus,
  computeCapitalEvolution,
  computeTotalCapital,
  formatCurrency,
} from '@/lib/finance';
import { CategoryIcon } from '@/components/CategoryIcon';

export default function DashboardPage() {
  const { transactions, budgets, accounts, investments } = useFinanceStore();
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [mounted, setMounted] = useState(false);
  
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd')); // Default to 1M

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  
  const daysDiff = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s) || isNaN(e)) return 0;
    return differenceInDays(e, s);
  }, [startDate, endDate]);

  const isMultiMonth = daysDiff > 31;
  const monthsCount = Math.max(1, Math.round(daysDiff / 30));

  const filteredTxs = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter(t => t.account_id === selectedAccountId);
  }, [transactions, selectedAccountId]);

  const targetAccounts = useMemo(() => {
    return selectedAccountId === 'all' ? accounts || [] : accounts?.filter(a => a.id === selectedAccountId) || [];
  }, [accounts, selectedAccountId]);

  const targetInvestments = useMemo(() => {
    if (selectedAccountId === 'all') return investments || [];
    const selectedAccount = accounts?.find(a => a.id === selectedAccountId);
    if (!selectedAccount || selectedAccount.type !== 'investment') return [];
    return (investments || []).filter(i => i.platform === selectedAccount.name);
  }, [investments, accounts, selectedAccountId]);

  const stats = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s) || isNaN(e)) return { income: 0, expenses: 0, net: 0, savingsRate: 0 };
    return computeRangeStats(filteredTxs, s, e);
  }, [filteredTxs, startDate, endDate]);
  const lastMonthStats = useMemo(
    () => computeMonthStats(filteredTxs, subMonths(now, 1)),
    [filteredTxs]
  );
  
  const totalCapitalData = useMemo(
    () => computeTotalCapital(targetAccounts, targetInvestments, filteredTxs),
    [targetAccounts, targetInvestments, filteredTxs]
  );

  const budgetStatus = useMemo(
    () => computeBudgetStatus(filteredTxs, budgets),
    [filteredTxs, budgets]
  );
  const recent = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s) || isNaN(e)) return [];
    return filterByRange(filteredTxs, s, e)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6);
  }, [filteredTxs, startDate, endDate]);

  const currentMonthStats = useMemo(
    () => computeMonthStats(filteredTxs, now),
    [filteredTxs]
  );
  const expenseDiff = currentMonthStats.expenses - lastMonthStats.expenses;

  const alerts = budgetStatus.filter((b) => b.status === 'danger' || b.status === 'over');

  const avgPerMonth = {
    income: stats.income / monthsCount,
    expenses: stats.expenses / monthsCount,
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-lg font-medium text-zinc-300 capitalize mt-0.5">
            {isMultiMonth
              ? `Période sélectionnée — vue agrégée`
              : format(new Date(startDate), 'MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker 
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
          />
          <Link href="/transactions">
            <Button size="sm" className="hidden sm:inline-flex">+ Transaction</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select 
          value={selectedAccountId} 
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-48 bg-zinc-900 border-white/5 text-sm h-9"
        >
          <option value="all">Tous les comptes</option>
          {accounts?.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </Select>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-200">
                {alerts.length} budget{alerts.length > 1 ? 's' : ''} à surveiller
              </div>
              <div className="mt-1 text-xs text-amber-300/80">
                {alerts
                  .slice(0, 3)
                  .map((a) => `${a.category.name} (${a.percent.toFixed(0)}%)`)
                  .join(' • ')}
              </div>
            </div>
            <Link href="/budgets" className="text-xs font-medium text-amber-200 hover:underline">
              Voir →
            </Link>
          </div>
        </div>
      )}

      {/* KPI cards - Net Worth Focus */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <KpiCard
          label={selectedAccountId === 'all' ? "Capital Total (Net Worth)" : "Solde Actuel"}
          value={formatCurrency(totalCapitalData.total)}
          accent="text-indigo-400"
        />
        <KpiCard
          label={isMultiMonth ? `Revenus de la période` : 'Revenus du mois'}
          value={formatCurrency(stats.income)}
          accent="text-emerald-400"
          hint={isMultiMonth ? `≈ ${formatCurrency(avgPerMonth.income)} / mois` : undefined}
        />
        <KpiCard
          label={isMultiMonth ? `Dépenses de la période` : 'Dépenses du mois'}
          value={formatCurrency(stats.expenses)}
          accent="text-red-400"
          hint={isMultiMonth ? `≈ ${formatCurrency(avgPerMonth.expenses)} / mois` : undefined}
        />
        
        {/* Nouveau Rectangle Bleu : Reste à vivre */}
        <Card className="bg-blue-900/20 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden">
          <div className="flex flex-col h-full items-center justify-center text-center p-2">
            <div className="text-xs font-semibold text-blue-200/80 uppercase tracking-wider mb-1">Reste à vivre</div>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(stats.net)}</div>
          </div>
        </Card>

        <KpiCard
          label="Taux d'épargne"
          value={`${stats.savingsRate.toFixed(0)}%`}
          accent={stats.savingsRate >= 20 ? 'text-emerald-400' : 'text-amber-400'}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader title="Croissance du Capital" subtitle="Données temps réel" />
          <CapitalEvolutionChart accounts={targetAccounts} investments={targetInvestments} transactions={filteredTxs} startDate={startDate} endDate={endDate} />
        </Card>
        <Card>
          <CardHeader 
            title="Dépenses par catégorie" 
            titleClassName="text-lg font-bold text-red-400"
          />
          <CategoryPieChart transactions={filteredTxs} type="expense" startDate={startDate} endDate={endDate} />
        </Card>
        <Card>
          <CardHeader 
            title="Revenus par catégorie" 
            titleClassName="text-lg font-bold text-emerald-400"
          />
          <CategoryPieChart transactions={filteredTxs} type="income" startDate={startDate} endDate={endDate} />
        </Card>
      </div>

      <Card>
        <IncomeExpenseChart transactions={filteredTxs} startDate={startDate} endDate={endDate} />
      </Card>

      {/* Budgets + Recent transactions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Budgets en cours"
            subtitle={`${budgetStatus.length} catégorie(s)`}
            action={
              <Link href="/budgets">
                <Button size="sm" variant="ghost">Gérer →</Button>
              </Link>
            }
          />
          {budgetStatus.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              Aucun budget défini.
            </div>
          ) : (
            <div className="space-y-3">
              {budgetStatus.slice(0, 4).map((b) => (
                <BudgetProgress key={b.id} item={b} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Dernières transactions"
            subtitle={isMultiMonth ? "Sur la période" : "Ce mois-ci"}
            action={
              <Link href="/transactions">
                <Button size="sm" variant="ghost">Tout voir →</Button>
              </Link>
            }
          />
          <div className="divide-y divide-white/5">
            {recent.map((tx) => {
              const catName = tx.category || 'Standard';
              const acc = accounts?.find(a => a.id === tx.account_id);
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm bg-zinc-800/80 border border-white/5 shadow-inner">
                      <CategoryIcon category={catName} amount={tx.amount} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-100">{tx.label}</div>
                      <div className="text-[11px] text-zinc-500">
                        {format(parseISO(tx.date), 'd MMM', { locale: fr })} • {catName} • {acc?.name}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, diff, diffInvert, hint }) {
  const showDiff = typeof diff === 'number' && !isNaN(diff);
  const isPositive = diffInvert ? diff < 0 : diff > 0;
  return (
    <Card>
      <div className="flex flex-col h-full items-center justify-center text-center">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
        {showDiff && (
          <div className={`mt-2 text-[11px] font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {diff >= 0 ? '+' : ''}{formatCurrency(diff)} vs mois précédent
          </div>
        )}
        {hint && !showDiff && <div className="mt-2 text-[11px] text-zinc-500 font-medium">{hint}</div>}
      </div>
    </Card>
  );
}
