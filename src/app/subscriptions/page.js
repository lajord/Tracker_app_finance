'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/finance';
import { format, parseISO, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';

const CANCELLED_KEY = 'tracker_cancelled_subs';

function loadCancelled() {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(CANCELLED_KEY) || '[]'));
  } catch { return new Set(); }
}

function saveCancelled(set) {
  localStorage.setItem(CANCELLED_KEY, JSON.stringify([...set]));
}

function getGroupKey(label) {
  const cleaned = (label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(cb |paiement par carte \w+ |carte \d+ )/, '')
    .trim();

  // Extract the first word as the group key
  // This groups "anthropic api" and "anthropic pro" together
  const firstWord = cleaned.split(' ')[0];
  return firstWord || cleaned;
}

function getDisplayName(key, txs) {
  // Use the first word capitalized as display name
  // If all transactions share more of the prefix, use that
  const labels = txs.map(t => t.label.trim());
  if (labels.length === 1) return labels[0];

  // Find common prefix among all labels (case-insensitive)
  const lower = labels.map(l => l.toLowerCase());
  let prefix = lower[0];
  for (let i = 1; i < lower.length; i++) {
    while (!lower[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  // Trim trailing spaces/special chars and use original casing from first label
  const cleanLen = prefix.replace(/[\s\-_.*]+$/, '').length;
  if (cleanLen >= 3) return labels[0].slice(0, cleanLen);
  return labels[0];
}

export default function SubscriptionsPage() {
  const { transactions, accounts } = useFinanceStore();
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [cancelled, setCancelled] = useState(new Set());

  useEffect(() => {
    setMounted(true);
    setCancelled(loadCancelled());
  }, []);

  const toggleCancelled = useCallback((key) => {
    setCancelled(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      saveCancelled(next);
      return next;
    });
  }, []);

  const aggregated = useMemo(() => {
    const subs = transactions.filter(t =>
      (t.category || '').toLowerCase().includes('abonnement')
    );

    const groups = {};
    for (const tx of subs) {
      const key = getGroupKey(tx.label);
      if (!groups[key]) {
        groups[key] = { key, transactions: [], total: 0 };
      }
      groups[key].transactions.push(tx);
      groups[key].total += Number(tx.amount);
    }

    return Object.values(groups)
      .map(g => {
        const sorted = [...g.transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
        const latest = sorted[0];
        const oldest = sorted[sorted.length - 1];
        const months = Math.max(1, differenceInMonths(parseISO(latest.date), parseISO(oldest.date)) + 1);
        return {
          ...g,
          displayName: getDisplayName(g.key, g.transactions),
          transactions: sorted,
          count: sorted.length,
          latestDate: latest.date,
          avgPerMonth: g.total / months,
        };
      })
      .sort((a, b) => a.total - b.total);
  }, [transactions]);

  const activeCount = aggregated.filter(g => !cancelled.has(g.key)).length;
  const totalActive = aggregated
    .filter(g => !cancelled.has(g.key))
    .reduce((sum, g) => sum + g.total, 0);

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Abonnements</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activeCount} actif{activeCount > 1 ? 's' : ''}
            {cancelled.size > 0 && <span className="text-zinc-600"> — {cancelled.size} résilié{cancelled.size > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white tabular-nums">{formatCurrency(totalActive)}</div>
          <div className="mt-1 text-xs text-zinc-500">Total cumulé (actifs)</div>
        </div>
      </div>

      {/* List */}
      {aggregated.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-sm text-zinc-500">
            Les transactions catégorisées "abonnement" apparaîtront ici.
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-white/5">
            {aggregated.map(group => {
              const isExpanded = expandedId === group.key;
              const isCancelled = cancelled.has(group.key);

              return (
                <div key={group.key} className={`transition-opacity ${isCancelled ? 'opacity-40' : ''}`}>
                  {/* Row */}
                  <div className="flex items-center gap-4 px-5 py-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : group.key)}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium truncate ${isCancelled ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                          {group.displayName}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {group.count}x — dernier le {format(parseISO(group.latestDate), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-zinc-200 tabular-nums">{formatCurrency(group.total)}</div>
                        <div className="text-[11px] text-zinc-500 tabular-nums">~ {formatCurrency(group.avgPerMonth)}/mois</div>
                      </div>

                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                      onClick={() => toggleCancelled(group.key)}
                      title={isCancelled ? 'Réactiver' : 'Marquer comme résilié'}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        isCancelled
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {isCancelled ? 'Réactiver' : 'Résilié'}
                    </button>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="bg-zinc-900/30 px-5 pb-3">
                      {group.transactions.map(tx => {
                        const acc = accounts?.find(a => a.id === tx.account_id);
                        return (
                          <div key={tx.id} className="flex items-center justify-between py-1.5 text-[12px] text-zinc-500">
                            <span className="w-24 shrink-0">{format(parseISO(tx.date), 'dd/MM/yyyy')}</span>
                            <span className="flex-1 truncate text-zinc-400">{tx.label}</span>
                            <span className="ml-3 shrink-0 tabular-nums text-zinc-400">{formatCurrency(tx.amount)}</span>
                          </div>
                        );
                      })}
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
