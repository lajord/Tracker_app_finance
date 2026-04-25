'use client';

import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/finance';
import { format, parseISO, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';

function getGroupKey(label) {
  const cleaned = (label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(cb |paiement par carte \w+ |carte \d+ )/, '')
    .trim();

  const firstWord = cleaned.split(' ')[0];
  return firstWord || cleaned;
}

function getDisplayName(_, transactions) {
  const labels = transactions.map((transaction) => transaction.label.trim());
  if (labels.length === 1) return labels[0];

  const lower = labels.map((label) => label.toLowerCase());
  let prefix = lower[0];

  for (let index = 1; index < lower.length; index += 1) {
    while (!lower[index].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }

  const cleanLength = prefix.replace(/[\s\-_.*]+$/, '').length;
  if (cleanLength >= 3) return labels[0].slice(0, cleanLength);
  return labels[0];
}

export default function SubscriptionsPage() {
  const {
    transactions,
    subscriptionPreferences,
    setSubscriptionCancelled,
  } = useFinanceStore();
  const [expandedId, setExpandedId] = useState(null);
  const [pendingKey, setPendingKey] = useState(null);

  const cancelled = useMemo(
    () =>
      new Set(
        (subscriptionPreferences || [])
          .filter((preference) => preference.is_cancelled)
          .map((preference) => preference.group_key)
      ),
    [subscriptionPreferences]
  );

  const toggleCancelled = useCallback(
    async (key, nextValue) => {
      setPendingKey(key);
      try {
        await setSubscriptionCancelled(key, nextValue);
      } finally {
        setPendingKey(null);
      }
    },
    [setSubscriptionCancelled]
  );

  const aggregated = useMemo(() => {
    const subscriptions = transactions.filter((transaction) =>
      (transaction.category || '').toLowerCase().includes('abonnement')
    );

    const groups = {};
    for (const transaction of subscriptions) {
      const key = getGroupKey(transaction.label);
      if (!groups[key]) {
        groups[key] = { key, transactions: [], total: 0 };
      }
      groups[key].transactions.push(transaction);
      groups[key].total += Number(transaction.amount);
    }

    return Object.values(groups)
      .map((group) => {
        const sorted = [...group.transactions].sort((left, right) => (left.date < right.date ? 1 : -1));
        const latest = sorted[0];
        const oldest = sorted[sorted.length - 1];
        const months = Math.max(1, differenceInMonths(parseISO(latest.date), parseISO(oldest.date)) + 1);

        return {
          ...group,
          displayName: getDisplayName(group.key, group.transactions),
          transactions: sorted,
          count: sorted.length,
          latestDate: latest.date,
          avgPerMonth: group.total / months,
        };
      })
      .sort((left, right) => left.total - right.total);
  }, [transactions]);

  const activeCount = aggregated.filter((group) => !cancelled.has(group.key)).length;
  const totalActive = aggregated
    .filter((group) => !cancelled.has(group.key))
    .reduce((sum, group) => sum + group.total, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Abonnements</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activeCount} actif{activeCount > 1 ? 's' : ''}
            {cancelled.size > 0 && (
              <span className="text-zinc-600"> - {cancelled.size} resilie{cancelled.size > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white tabular-nums">{formatCurrency(totalActive)}</div>
          <div className="mt-1 text-xs text-zinc-500">Total cumule (actifs)</div>
        </div>
      </div>

      {aggregated.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-sm text-zinc-500">
            Les transactions categorisees abonnement apparaitront ici.
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-white/5">
            {aggregated.map((group) => {
              const isExpanded = expandedId === group.key;
              const isCancelled = cancelled.has(group.key);
              const isSaving = pendingKey === group.key;

              return (
                <div key={group.key} className={`transition-opacity ${isCancelled ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-4 px-5 py-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : group.key)}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-medium truncate ${
                            isCancelled ? 'text-zinc-500 line-through' : 'text-zinc-100'
                          }`}
                        >
                          {group.displayName}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {group.count}x - dernier le {format(parseISO(group.latestDate), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-zinc-200 tabular-nums">{formatCurrency(group.total)}</div>
                        <div className="text-[11px] text-zinc-500 tabular-nums">
                          ~ {formatCurrency(group.avgPerMonth)}/mois
                        </div>
                      </div>

                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-zinc-600 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => toggleCancelled(group.key, !isCancelled)}
                      disabled={isSaving}
                      title={isCancelled ? 'Reactiver' : 'Marquer comme resilie'}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        isCancelled
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                      } ${isSaving ? 'cursor-wait opacity-60' : ''}`}
                    >
                      {isSaving ? '...' : isCancelled ? 'Reactiver' : 'Resilie'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="bg-zinc-900/30 px-5 pb-3">
                      {group.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between py-1.5 text-[12px] text-zinc-500"
                        >
                          <span className="w-24 shrink-0">
                            {format(parseISO(transaction.date), 'dd/MM/yyyy')}
                          </span>
                          <span className="flex-1 truncate text-zinc-400">{transaction.label}</span>
                          <span className="ml-3 shrink-0 tabular-nums text-zinc-400">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
