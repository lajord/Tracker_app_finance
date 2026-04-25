// Pure calculation helpers for finance data.

import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  startOfDay,
  endOfDay,
  subMonths,
  subDays,
  format,
  parseISO,
  isWithinInterval,
  differenceInMonths,
  differenceInDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatCurrency = (amount, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

export const formatShort = (amount) => {
  const abs = Math.abs(amount);
  if (abs >= 1000) return `${(amount / 1000).toFixed(1)}k€`;
  return `${amount.toFixed(0)}€`;
};

// ------------------------------------------------------------
// Period helpers
// ------------------------------------------------------------
export const PERIODS = {
  current_month: { label: 'Ce mois-ci', months: 1, anchor: 'current' },
  last_3_months: { label: '3 derniers mois', months: 3, anchor: 'range' },
  last_6_months: { label: '6 derniers mois', months: 6, anchor: 'range' },
  year_to_date: { label: 'Année en cours', months: 12, anchor: 'ytd' },
};

export function getPeriodBounds(periodKey, now = new Date()) {
  const p = PERIODS[periodKey] || PERIODS.current_month;
  if (p.anchor === 'current') {
    return { start: startOfMonth(now), end: endOfMonth(now), months: 1 };
  }
  if (p.anchor === 'ytd') {
    return { start: startOfYear(now), end: endOfMonth(now), months: now.getMonth() + 1 };
  }
  // range: last N months ending this month
  const start = startOfMonth(subMonths(now, p.months - 1));
  return { start, end: endOfMonth(now), months: p.months };
}

// ------------------------------------------------------------
// Period-based stats
// ------------------------------------------------------------
export function filterByRange(transactions, from, to) {
  return transactions.filter((t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: from, end: to });
  });
}

export function computeRangeStats(transactions, from, to) {
  const filtered = filterByRange(transactions, from, to);
  let income = 0;
  let expenses = 0;
  for (const t of filtered) {
    if (t.category === 'Transfert Interne') continue;
    
    if (t.amount > 0) income += Number(t.amount);
    else expenses += Math.abs(Number(t.amount));
  }
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  return { income, expenses, net, savingsRate, count: filtered.length };
}

export function computePeriodStats(transactions, periodKey, now = new Date()) {
  const { start, end } = getPeriodBounds(periodKey, now);
  return computeRangeStats(transactions, start, end);
}

export function computeMonthStats(transactions, date = new Date()) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return computeRangeStats(transactions, start, end);
}

// ------------------------------------------------------------
// Monthly breakdown for chart (always 6 months)
// ------------------------------------------------------------
export function computeLastMonthsStats(transactions, months = 6) {
  const now = new Date();
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    const stats = computeMonthStats(transactions, d);
    result.push({
      month: format(d, 'MMM', { locale: fr }),
      monthFull: format(d, 'MMMM yyyy', { locale: fr }),
      income: Math.round(stats.income),
      expenses: Math.round(stats.expenses),
      net: Math.round(stats.net),
    });
  }
  return result;
}

export function computeIncomeExpenseRange(transactions, startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  let end = new Date(endDateStr);
  const now = new Date();
  if (end > now) end = now; 

  const result = [];
  const daysDiff = differenceInDays(end, start);

  if (daysDiff <= 60) {
    const totalDays = Math.max(1, daysDiff + 1);
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = subDays(end, i);
      const stats = computeRangeStats(transactions, startOfDay(d), endOfDay(d));
      result.push({
        month: format(d, 'd MMM', { locale: fr }),
        monthFull: format(d, 'dd MMMM yyyy', { locale: fr }),
        income: Math.round(stats.income),
        expenses: Math.round(stats.expenses),
        net: Math.round(stats.net),
      });
    }
  } else {
    const totalMonths = Math.max(1, differenceInMonths(end, start) + 1);
    for (let i = totalMonths - 1; i >= 0; i--) {
      const d = subMonths(end, i);
      const stats = computeRangeStats(transactions, startOfMonth(d), endOfMonth(d));
      result.push({
        month: format(d, 'MMM', { locale: fr }),
        monthFull: format(d, 'MMMM yyyy', { locale: fr }),
        income: Math.round(stats.income),
        expenses: Math.round(stats.expenses),
        net: Math.round(stats.net),
      });
    }
  }
  return result;
}

// ------------------------------------------------------------
// Category breakdown for a given period
// ------------------------------------------------------------
export function computeCategoryBreakdown(transactions, periodKey, type = 'expense', now = new Date()) {
  const { start, end } = getPeriodBounds(periodKey, now);
  return computeCategoryBreakdownRange(transactions, start, end, type);
}

export function computeCategoryBreakdownRange(transactions, start, end, type = 'expense') {
  const filtered = filterByRange(transactions, start, end).filter((t) => {
    if (t.category === 'Transfert Interne') return false;
    return type === 'income' ? t.amount > 0 : t.amount < 0;
  });
  const byCat = new Map();
  for (const t of filtered) {
    const catName = t.category || 'Standard';
    const current = byCat.get(catName) || { name: catName, total: 0 };
    current.total += Math.abs(Number(t.amount));
    byCat.set(catName, current);
  }
  return Array.from(byCat.values()).sort((a, b) => b.total - a.total);
}

// ------------------------------------------------------------
// Budgets
// ------------------------------------------------------------
export function computeBudgetStatus(transactions, budgets, date = new Date()) {
  const breakdown = computeCategoryBreakdown(transactions, 'current_month', date);

  return budgets
    .map((b) => {
      const spent = breakdown.find((c) => c.name === b.category)?.total || 0;
      const percent = b.amount_limit > 0 ? (spent / b.amount_limit) * 100 : 0;
      return {
        id: b.id,
        category: { name: b.category, icon: '🏷️' }, // Emulate category obj for UI
        limit: Number(b.amount_limit),
        spent,
        percent,
        remaining: Math.max(0, Number(b.amount_limit) - spent),
        status: percent >= 100 ? 'over' : percent >= 85 ? 'danger' : percent >= 60 ? 'warn' : 'ok',
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

// ------------------------------------------------------------
// Recent transactions
// ------------------------------------------------------------
export function getRecentForPeriod(transactions, periodKey, limit = 6, now = new Date()) {
  const { start, end } = getPeriodBounds(periodKey, now);
  return filterByRange(transactions, start, end)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

// ------------------------------------------------------------
// Account balances & Total Capital
// ------------------------------------------------------------
export function computeAccountBalances(accounts, transactions) {
  return accounts.map(acc => {
    const accTxs = transactions.filter(t => t.account_id === acc.id);
    const flow = accTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    return { ...acc, balance: (acc.initial_balance || 0) + flow };
  });
}

export function computeTotalCapital(accounts, investments, transactions) {
  const balances = computeAccountBalances(accounts, transactions);
  const liquidWealth = balances.reduce((sum, a) => sum + a.balance, 0);
  const investedWealth = investments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
  return {
    total: liquidWealth + investedWealth,
    liquid: liquidWealth,
    invested: investedWealth,
    accounts: balances,
    investments
  };
}

export function computeCapitalEvolution(accounts, investments, transactions, months = 6) {
  const endDateStr = format(new Date(), 'yyyy-MM-dd');
  const startDateStr = format(subMonths(new Date(), months - 1), 'yyyy-MM-dd');
  return computeCapitalEvolutionRange(accounts, investments, transactions, startDateStr, endDateStr);
}

export function computeCapitalEvolutionRange(accounts, investments, transactions, startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  let end = new Date(endDateStr);
  const now = new Date();
  
  if (end > now) end = now; // ne pas simuler le futur

  const currentCapital = computeTotalCapital(accounts, investments, transactions).total;
  let capAtEnd = currentCapital;
  
  // on retire le flux qui s'est passé entre "end" et aujourd'hui
  const txsSinceEnd = filterByRange(transactions, end, now);
  const flowSinceEnd = txsSinceEnd.reduce((sum, t) => sum + Number(t.amount), 0);
  capAtEnd -= flowSinceEnd;

  const result = [];
  let runningCapital = capAtEnd;
  
  const daysDiff = differenceInDays(end, start);

  if (daysDiff <= 60) {
    const totalDays = Math.max(1, daysDiff + 1);
    for (let i = 0; i < totalDays; i++) {
      const d = subDays(end, i);
      result.unshift({ 
        month: format(d, 'd MMM', { locale: fr }),
        monthFull: format(d, 'dd MMMM yyyy', { locale: fr }),
        capital: Math.round(runningCapital),
      });
      const dayTxs = filterByRange(transactions, startOfDay(d), endOfDay(d));
      const rawNetFlow = dayTxs.reduce((sum, t) => sum + Number(t.amount), 0);
      runningCapital -= rawNetFlow;
    }
  } else {
    const totalMonths = Math.max(1, differenceInMonths(end, start) + 1);
    for (let i = 0; i < totalMonths; i++) {
      const d = subMonths(end, i);
      result.unshift({ 
        month: format(d, 'MMM', { locale: fr }),
        monthFull: format(d, 'MMMM yyyy', { locale: fr }),
        capital: Math.round(runningCapital),
      });
      const monthTxs = filterByRange(transactions, startOfMonth(d), endOfMonth(d));
      const rawNetFlow = monthTxs.reduce((sum, t) => sum + Number(t.amount), 0);
      runningCapital -= rawNetFlow;
    }
  }
  return result;
}
