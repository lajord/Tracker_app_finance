'use client';

import { useState } from 'react';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { format } from 'date-fns';

export function InvestmentOperationForm({ investments, accounts, onSubmit, onCancel }) {
  const [investmentId, setInvestmentId] = useState(investments?.[0]?.id || 'NEW');
  const [assetName, setAssetName] = useState('');
  const investmentAccounts = (accounts || []).filter(a => a.type === 'investment');
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
    if (!investmentId) return setError("Choisissez un investissement cible");
    if (investmentId === 'NEW') {
      if (!assetName.trim()) return setError("Le nom de l'actif est requis");
      if (!platform.trim()) return setError("La plateforme est requise");
    }
    if (!amount || isNaN(Number(amount))) return setError("Montant (Input) invalide");
    if (!price || isNaN(Number(price))) return setError("Prix unitaire invalide");
    if (!quantity || isNaN(Number(quantity))) return setError("Quantité achetée invalide");
    if (fees !== '' && isNaN(Number(fees))) return setError("Frais invalides");

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
      // reset forms
      setAmount('');
      setPrice('');
      setQuantity('');
      setFees('');
    } catch (err) {
      setError(err.message || "Erreur lors de l'ajout de l'opération");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <Select label="Actif / ETF Ciblé" value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}>
        {investments.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} {a.platform ? `(${a.platform})` : ''}
          </option>
        ))}
        <option value="NEW">➕ Nouvel Actif (ETF, Action, Crypto...)</option>
      </Select>

      {investmentId === 'NEW' && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nom de l'actif" placeholder="ex: Bitcoin" value={assetName} onChange={e => setAssetName(e.target.value)} />
          <Select label="Compte dépositaire" value={platform} onChange={e => setPlatform(e.target.value)}>
            {investmentAccounts.map((acc) => (
              <option key={acc.id} value={acc.name}>
                {acc.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Input (€)" type="number" step="any" min="0" placeholder="ex: 50.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Prix U. (€)" type="number" step="any" min="0" placeholder="ex: 17.50" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input label="Qté achetée" type="number" step="any" placeholder="ex: 2.857142" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Input label="Frais (€)" type="number" step="any" min="0" placeholder="0" value={fees} onChange={(e) => setFees(e.target.value)} />
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? 'Ajout…' : 'Ajouter l\'opération'}
        </Button>
      </div>
    </form>
  );
}
