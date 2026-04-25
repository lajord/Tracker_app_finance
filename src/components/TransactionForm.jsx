'use client';

import { useState } from 'react';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { format } from 'date-fns';

export function TransactionForm({ availableCats, accounts, onSubmit, onCancel }) {
  const [kind, setKind] = useState('expense');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (kind === 'transfer') {
      if (!fromAccountId || !toAccountId) return setError('Choisissez les deux comptes');
      if (fromAccountId === toAccountId) return setError('Les comptes doivent être différents');
      setSubmitting(true);
      try {
        await onSubmit({
          isTransfer: true,
          label: label.trim() || 'Virement',
          amount: Math.abs(Number(amount)),
          date,
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          category: 'Transfert Interne',
        });
        setLabel('');
        setAmount('');
      } catch (err) {
        setError(err.message || "Erreur lors de l'ajout");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!label.trim()) return setError('Le libellé est requis');
    if (!category.trim()) return setError('Indiquez une catégorie');
    if (!accountId) return setError('Choisissez un compte');

    const signedAmount = kind === 'expense' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

    setSubmitting(true);
    try {
      await onSubmit({
        label: label.trim(),
        amount: signedAmount,
        date,
        category: category.trim(),
        account_id: accountId,
      });
      // reset
      setLabel('');
      setAmount('');
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setKind('expense');
          }}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            kind === 'expense'
              ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
              : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          💸 Dépense
        </button>
        <button
          type="button"
          onClick={() => {
            setKind('income');
          }}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            kind === 'income'
              ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          💰 Revenu
        </button>
        <button
          type="button"
          onClick={() => {
            setKind('transfer');
          }}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
            kind === 'transfer'
              ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
              : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          🔄 Virement
        </button>
      </div>

      <Input
        label="Libellé"
        placeholder={kind === 'transfer' ? 'Virement...' : 'Courses, salaire…'}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Montant (€)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {kind !== 'transfer' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-400">Catégorie</label>
          <input
            list="cat-list"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ex: Courses, Salaire..."
            className="block w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <datalist id="cat-list">
            {availableCats?.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      )}

      {kind !== 'transfer' ? (
        <Select label="Compte" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Select label="De (Source)" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <Select label="Vers (Destination)" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? 'Ajout…' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
