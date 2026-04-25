'use client';

import { useMemo, useState, useEffect } from 'react';
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
      
      let stripeAcc = accounts?.find(a => a.name.toLowerCase() === 'stripe');
      if (!stripeAcc) {
        stripeAcc = await addAccount({ name: 'Stripe', type: 'stripe' });
      }
      
      let added = 0;
      let updated = 0;
      for (const tx of data.transactions) {
        // Validation anti-doublons et upsert basée sur external_id
        if (tx.external_id) {
          const existing = transactions.find(t => t.external_id === tx.external_id);
          if (!existing) {
            await addTransaction({ ...tx, account_id: stripeAcc ? stripeAcc.id : null });
            added++;
          } else if (existing.category !== tx.category) {
            // Met à jour la catégorie (ex: passage de Salaire à Entrepreneuriat)
            await updateTransaction(existing.id, { category: tx.category });
            updated++;
          }
        }
      }
      alert(`Sync Stripe terminée: ${added} nouvelles transactions importées, ${updated} mises à jour.`);
    } catch (err) {
      alert(`Impossible de synchroniser Stripe :\n${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const availableCats = useMemo(() => {
    const historical = transactions.map((t) => t.category).filter(Boolean);
    return Array.from(new Set([...BASELINE_CATEGORIES, ...historical]));
  }, [transactions]);

  const filtered = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        if (filterType === 'income' && t.amount <= 0) return false;
        if (filterType === 'expense' && t.amount >= 0) return false;
        if (filterCat !== 'all' && t.category !== filterCat) return false;
        if (search && !t.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, search, filterType, filterCat]);

  const total = filtered.reduce((acc, t) => acc + Number(t.amount), 0);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <datalist id="inline-cats">
        {availableCats.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Transactions</h1>
          <p className="text-sm text-zinc-400">{filtered.length} résultats • Total: {formatCurrency(total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleStripeSync} disabled={isSyncing} className={isSyncing ? "animate-pulse" : ""}>
            {isSyncing ? 'Sync...' : 'Sync Stripe'}
          </Button>
          <Button variant="ghost" onClick={() => { setShowImport(!showImport); setShowForm(false); }}>
            {showImport ? 'Fermer import' : 'Importer CSV'}
          </Button>
          <Button onClick={() => { setShowForm((s) => !s); setShowImport(false); }}>
            {showForm ? 'Fermer' : '+ Transaction'}
          </Button>
        </div>
      </div>

      {showImport && (
        <Card>
          <CardHeader title="Import Automatique" subtitle="Via fichier CSV bancaire" />
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
                  account_id: data.from_account_id
                });
                try {
                  await addTransaction({
                    label: data.label,
                    amount: Math.abs(data.amount),
                    date: data.date,
                    category: data.category,
                    account_id: data.to_account_id
                  });
                } catch (err) {
                  // Rollback: supprimer le débit si le crédit échoue
                  await deleteTransaction(debitTx.id);
                  throw new Error('Virement échoué : le compte destination est introuvable. Aucun montant n\'a été débité.');
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
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="🔍 Rechercher un libellé…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tous les types</option>
            <option value="income">Revenus uniquement</option>
            <option value="expense">Dépenses uniquement</option>
          </Select>
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">Toutes les catégories</option>
            {availableCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">Aucune transaction</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((tx) => {
              const catName = tx.category || 'À catégoriser';
              const acc = accounts?.find((a) => a.id === tx.account_id);

              return (
                <div key={tx.id} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <div
                    className="flex cursor-pointer items-center gap-4 px-3 py-4"
                    onClick={() => setEditingTx(tx)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 border border-white/5 shadow-inner">
                      <CategoryIcon category={catName} amount={tx.amount} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-200">{tx.label}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 tracking-wide">
                        <span>{format(parseISO(tx.date), 'dd MMM yyyy', { locale: fr })}</span>
                        <span className="h-1 w-1 rounded-full bg-zinc-600"></span>
                        <span className="font-medium text-zinc-400">{catName}</span>
                        <span className="h-1 w-1 rounded-full bg-zinc-600"></span>
                        <span className="uppercase text-zinc-500">{acc?.name || '—'}</span>
                        {tx.source !== 'manual' && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-zinc-600"></span>
                            <span className="uppercase text-zinc-600">
                              {tx.source}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium tabular-nums tracking-tight ${
                        tx.amount >= 0 ? 'text-emerald-500' : 'text-zinc-300'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTransaction(tx.id);
                      }}
                      className="ml-4 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      ×
                    </button>
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
