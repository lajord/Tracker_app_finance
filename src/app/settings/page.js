'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { useFinanceStore } from '@/lib/store';

export default function SettingsPage() {
  const { accounts, isSupabaseConfigured, transactions } = useFinanceStore();
  const availableCats = useMemo(() => Array.from(new Set(transactions.map((t) => t.category).filter(Boolean))), [transactions]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const handleReset = () => {
    if (confirm('Réinitialiser toutes les données locales ?')) {
      localStorage.removeItem('tracker_finance_state_v3');
      window.location.reload();
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Paramètres</h1>
        <p className="text-sm text-zinc-400">Gère tes catégories, comptes et connexions</p>
      </div>

      <Card>
        <CardHeader title="État de la connexion" />
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900/50 p-3">
            <span className="text-zinc-400">Supabase</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {isSupabaseConfigured ? 'Connecté' : 'Mode démo (local)'}
            </span>
          </div>
          {!isSupabaseConfigured && (
            <p className="text-xs text-zinc-500">
              Crée un fichier <code className="text-indigo-400">.env.local</code> avec tes clés Supabase
              pour activer la persistance permanente. Exécute ensuite le schéma situé dans{' '}
              <code className="text-indigo-400">src/lib/schema.sql</code>.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Catégories" subtitle={`${availableCats.length} au total`} />
          <div className="space-y-1.5">
            {availableCats.map((catName) => (
              <div
                key={catName}
                className="flex items-center justify-between rounded-lg bg-zinc-900/40 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span>🏷️</span>
                  <span className="text-zinc-100">{catName}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Comptes" subtitle={`${accounts.length} au total`} />
          <div className="space-y-1.5">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg bg-zinc-900/40 px-3 py-2 text-sm"
              >
                <span className="text-zinc-100">{a.name}</span>
                <span className="text-xs text-zinc-500">
                  {a.type} • {a.currency}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Zone sensible" />
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            {transactions.length} transactions en mémoire locale
          </div>
          <button
            onClick={handleReset}
            className="rounded-xl bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-600/30"
          >
            Réinitialiser la démo
          </button>
        </div>
      </Card>
    </div>
  );
}
