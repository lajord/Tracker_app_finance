'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';

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

  const typeButtons = [
    { value: 'expense', label: 'Depense', active: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40' },
    { value: 'income', label: 'Revenu', active: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40' },
    { value: 'transfer', label: 'Virement', active: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (kind === 'transfer') {
      if (!fromAccountId || !toAccountId) return setError('Choisissez les deux comptes');
      if (fromAccountId === toAccountId) return setError('Les comptes doivent etre differents');

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

    if (!label.trim()) return setError('Le libelle est requis');
    if (!category.trim()) return setError('Indiquez une categorie');
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
      setLabel('');
      setAmount('');
    } catch (err) {
      setError(err.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {typeButtons.map((button) => (
          <button
            key={button.value}
            type="button"
            onClick={() => setKind(button.value)}
            className={`rounded-xl px-2 py-3 text-xs font-medium transition-colors sm:text-sm ${
              kind === button.value
                ? button.active
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>

      <Input
        label="Libelle"
        placeholder={kind === 'transfer' ? 'Virement...' : 'Courses, salaire...'}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Montant (EUR)"
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
          <label className="mb-1 block text-sm font-medium text-zinc-400">Categorie</label>
          <input
            list="cat-list"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ex: Courses, Salaire..."
            className="min-h-11 block w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <datalist id="cat-list">
            {availableCats?.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>
      )}

      {kind !== 'transfer' ? (
        <Select label="Compte" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="De" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          <Select label="Vers" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="w-full sm:flex-1">
          {submitting ? 'Ajout...' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
