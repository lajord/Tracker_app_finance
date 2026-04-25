'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';

export function InvestmentOperationForm({ investments, accounts, onSubmit, onCancel }) {
  const [investmentId, setInvestmentId] = useState(investments?.[0]?.id || 'NEW');
  const [assetName, setAssetName] = useState('');
  const investmentAccounts = (accounts || []).filter((account) => account.type === 'investment');
  const [platform, setPlatform] = useState(investmentAccounts[0]?.name || '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fees, setFees] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!investmentId) return setError('Choisissez un investissement cible');
    if (investmentId === 'NEW') {
      if (!assetName.trim()) return setError("Le nom de l'actif est requis");
      if (!platform.trim()) return setError('La plateforme est requise');
    }
    if (!amount || Number.isNaN(Number(amount))) return setError('Montant invalide');
    if (!price || Number.isNaN(Number(price))) return setError('Prix unitaire invalide');
    if (!quantity || Number.isNaN(Number(quantity))) return setError('Quantite achetee invalide');
    if (fees !== '' && Number.isNaN(Number(fees))) return setError('Frais invalides');

    setSubmitting(true);
    try {
      await onSubmit({
        isNew: investmentId === 'NEW',
        investmentId: investmentId === 'NEW' ? null : investmentId,
        assetName: assetName.trim(),
        platform: platform.trim(),
        date,
        amount: Number(amount),
        price: Number(price),
        quantity: Number(quantity),
        fees: fees === '' ? 0 : Number(fees),
      });
      setAmount('');
      setPrice('');
      setQuantity('');
      setFees('');
    } catch (err) {
      setError(err.message || "Erreur lors de l'ajout de l'operation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
      <Select label="Actif cible" value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}>
        {(investments || []).map((investment) => (
          <option key={investment.id} value={investment.id}>
            {investment.name} {investment.platform ? `(${investment.platform})` : ''}
          </option>
        ))}
        <option value="NEW">Nouvel actif</option>
      </Select>

      {investmentId === 'NEW' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Nom de l'actif"
            placeholder="ex: Bitcoin"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
          />
          <Select label="Compte depositaire" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {investmentAccounts.map((account) => (
              <option key={account.id} value={account.name}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          label="Montant (EUR)"
          type="number"
          step="any"
          min="0"
          placeholder="50.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Prix unitaire (EUR)"
          type="number"
          step="any"
          min="0"
          placeholder="17.50"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Input
          label="Quantite achetee"
          type="number"
          step="any"
          placeholder="2.857142"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Input
          label="Frais (EUR)"
          type="number"
          step="any"
          min="0"
          placeholder="0"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
        />
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="w-full sm:flex-1">
          {submitting ? 'Ajout...' : "Ajouter l'operation"}
        </Button>
      </div>
    </form>
  );
}
