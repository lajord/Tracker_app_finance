'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { CsvImportModal } from '@/components/CsvImportModal';
import { TransactionEditModal } from '@/components/TransactionEditModal';
import { TransactionForm } from '@/components/TransactionForm';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/finance';
import { BASELINE_CATEGORIES } from '@/lib/constants';

export default function TransactionsPage() {
  const { transactions, accounts, addAccount, addTransaction, deleteTransaction, updateTransaction } =
    useFinanceStore();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStripeSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/stripe');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur api stripe');

      let stripeAcc = accounts?.find((account) => account.name.toLowerCase() === 'stripe');
      if (!stripeAcc) {
        stripeAcc = await addAccount({ name: 'Stripe', type: 'stripe' });
      }

      let added = 0;
      let updated = 0;

      for (const tx of data.transactions) {
        if (tx.external_id) {
          const existing = transactions.find((item) => item.external_id === tx.external_id);
          if (!existing) {
            await addTransaction({ ...tx, account_id: stripeAcc ? stripeAcc.id : null });
            added += 1;
          } else if (existing.category !== tx.category) {
            await updateTransaction(existing.id, { category: tx.category });
            updated += 1;
          }
        }
      }

      alert(`Sync Stripe terminee: ${added} nouvelles transactions, ${updated} mises a jour.`);
    } catch (err) {
      alert(`Impossible de synchroniser Stripe :\n${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const availableCats = useMemo(() => {
    const historical = transactions.map((transaction) => transaction.category).filter(Boolean);
    return Array.from(new Set([...BASELINE_CATEGORIES, ...historical]));
  }, [transactions]);

  const filtered = useMemo(() => {
    return [...transactions]
      .filter((transaction) => {
        if (filterType === 'income' && transaction.amount <= 0) return false;
        if (filterType === 'expense' && transaction.amount >= 0) return false;
        if (filterCat !== 'all' && transaction.category !== filterCat) return false;
        if (search && !transaction.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((left, right) => (left.date < right.date ? 1 : -1));
  }, [transactions, search, filterType, filterCat]);

  const total = filtered.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <datalist id="inline-cats">
        {availableCats.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Transactions</h1>
          <p className="text-sm text-zinc-400">
            {filtered.length} resultats - Total: {formatCurrency(total)}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:w-auto">
          <Button
            variant="ghost"
            onClick={handleStripeSync}
            disabled={isSyncing}
            className={isSyncing ? 'animate-pulse' : ''}
          >
            {isSyncing ? 'Sync...' : 'Sync Stripe'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowImport(!showImport);
              setShowForm(false);
            }}
          >
            {showImport ? 'Fermer import' : 'Importer CSV'}
          </Button>
          <Button
            onClick={() => {
              setShowForm((state) => !state);
              setShowImport(false);
            }}
          >
            {showForm ? 'Fermer' : 'Ajouter'}
          </Button>
        </div>
      </div>

      {showImport && (
        <Card>
          <CardHeader title="Import automatique" subtitle="Via fichier CSV bancaire" />
          <CsvImportModal
            accounts={accounts}
            onImport={async (list) => {
              for (const tx of list) {
                await addTransaction(tx);
              }
              setShowImport(false);
            }}
            onCancel={() => setShowImport(false)}
          />
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader title="Ajouter une transaction" />
          <TransactionForm
            availableCats={availableCats}
            accounts={accounts}
            onSubmit={async (data) => {
              if (data.isTransfer) {
                const debitTx = await addTransaction({
                  label: data.label,
                  amount: -data.amount,
                  date: data.date,
                  category: data.category,
                  account_id: data.from_account_id,
                });

                try {
                  await addTransaction({
                    label: data.label,
                    amount: Math.abs(data.amount),
                    date: data.date,
                    category: data.category,
                    account_id: data.to_account_id,
                  });
                } catch (err) {
                  await deleteTransaction(debitTx.id);
                  throw new Error("Virement echoue : le compte destination est introuvable.");
                }
              } else {
                await addTransaction(data);
              }
            }}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <Input
            placeholder="Rechercher un libelle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tous les types</option>
            <option value="income">Revenus uniquement</option>
            <option value="expense">Depenses uniquement</option>
          </Select>
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">Toutes les categories</option>
            {availableCats.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">Aucune transaction</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((tx) => {
              const categoryName = tx.category || 'A categoriser';
              const account = accounts?.find((item) => item.id === tx.account_id);

              return (
                <div
                  key={tx.id}
                  className="group cursor-pointer px-1 py-1 transition-colors hover:bg-white/5"
                  onClick={() => setEditingTx(tx)}
                >
                  <div className="flex flex-col gap-3 rounded-2xl px-3 py-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-zinc-800/80 shadow-inner">
                        <CategoryIcon category={categoryName} amount={tx.amount} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-zinc-200">{tx.label}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] tracking-wide text-zinc-500">
                          <span>{format(parseISO(tx.date), 'dd MMM yyyy', { locale: fr })}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-600" />
                          <span className="font-medium text-zinc-400">{categoryName}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-600" />
                          <span className="uppercase text-zinc-500">{account?.name || '-'}</span>
                          {tx.source !== 'manual' && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-zinc-600" />
                              <span className="uppercase text-zinc-600">{tx.source}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div
                        className={`text-sm font-medium tracking-tight tabular-nums ${
                          tx.amount >= 0 ? 'text-emerald-500' : 'text-zinc-300'
                        }`}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {formatCurrency(tx.amount)}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTransaction(tx.id);
                        }}
                        className="rounded-lg px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Supprimer"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {editingTx && (
        <TransactionEditModal
          tx={editingTx}
          availableCats={availableCats}
          onSave={({ label, category }) => {
            updateTransaction(editingTx.id, { label, category });
            setEditingTx(null);
          }}
          onCancel={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
