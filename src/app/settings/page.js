'use client';

import { useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { useFinanceStore } from '@/lib/store';

export default function SettingsPage() {
  const {
    accounts,
    transactions,
    isSupabaseConfigured,
    isLoading,
    initializationError,
  } = useFinanceStore();

  const availableCategories = useMemo(
    () => Array.from(new Set(transactions.map((transaction) => transaction.category).filter(Boolean))),
    [transactions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Parametres</h1>
        <p className="text-sm text-zinc-400">Toutes les donnees sont maintenant gerees via Supabase.</p>
      </div>

      <Card>
        <CardHeader title="Etat de la connexion" />
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900/50 p-3">
            <span className="text-zinc-400">Supabase</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isSupabaseConfigured && !initializationError
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {isLoading ? 'Chargement...' : isSupabaseConfigured && !initializationError ? 'Connecte' : 'Erreur'}
            </span>
          </div>

          {initializationError ? (
            <p className="text-xs text-red-300">{initializationError}</p>
          ) : (
            <p className="text-xs text-zinc-500">
              Les anciennes donnees navigateur sont migrees automatiquement vers Supabase puis supprimees.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Categories" subtitle={`${availableCategories.length} au total`} />
          <div className="space-y-1.5">
            {availableCategories.map((categoryName) => (
              <div
                key={categoryName}
                className="flex items-center justify-between rounded-lg bg-zinc-900/40 px-3 py-2 text-sm"
              >
                <span className="text-zinc-100">{categoryName}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Comptes" subtitle={`${accounts.length} au total`} />
          <div className="space-y-1.5">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg bg-zinc-900/40 px-3 py-2 text-sm"
              >
                <span className="text-zinc-100">{account.name}</span>
                <span className="text-xs text-zinc-500">
                  {account.type} - {account.currency}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Persistance" />
        <div className="text-xs text-zinc-500">
          {transactions.length} transactions chargees depuis la base de donnees.
        </div>
      </Card>
    </div>
  );
}
