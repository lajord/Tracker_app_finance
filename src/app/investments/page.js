'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency, computeAccountBalances } from '@/lib/finance';
import { format, parseISO } from 'date-fns';
import { InvestmentOperationForm } from '@/components/InvestmentOperationForm';
import { Button } from '@/components/ui/Button';

export default function InvestmentsPage() {
  const { investments, updateInvestment, addInvestment, accounts, transactions } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);

  const investmentAccounts = useMemo(() => {
    const invAccs = (accounts || []).filter(a => a.type === 'investment');
    const balances = computeAccountBalances(invAccs, transactions);
    return balances.map(acc => {
      const invested = (investments || [])
        .filter(i => i.platform === acc.name)
        .reduce((sum, i) => sum + Number(i.invested_amount || 0), 0);
      return { ...acc, cash: acc.balance, invested, total: acc.balance + invested };
    });
  }, [accounts, transactions, investments]);

  const handleAddOperation = async (data) => {
    let targetInv;
    if (data.isNew) {
      targetInv = await addInvestment({
        name: data.assetName,
        platform: data.platform,
        category: 'ETF',
        invested_amount: 0,
        operations: []
      });
    } else {
      targetInv = investments.find(i => i.id === data.investmentId);
    }

    if (!targetInv) throw new Error("Investissement introuvable");

    const newOps = [...(targetInv.operations || []), {
      date: data.date,
      amount: data.amount,
      price: data.price,
      quantity: data.quantity,
      fees: data.fees
    }];
    
    const newAmount = newOps.reduce((sum, op) => sum + op.amount, 0);

    await updateInvestment(targetInv.id, {
      operations: newOps,
      invested_amount: newAmount
    });
    
    setShowForm(false);
  };

  const total = investments?.reduce((sum, i) => sum + Number(i.invested_amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Investissements</h1>
          <p className="text-sm text-zinc-400">Capital immobilisé / investi</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-400">{formatCurrency(total)}</div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Fermer' : '+ Opération'}
          </Button>
        </div>
      </div>

      {/* Résumé par plateforme */}
      {investmentAccounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {investmentAccounts.map(acc => (
            <Card key={acc.id} className="p-5">
              <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{acc.name}</div>
              <div className="mt-3 text-2xl font-bold text-white">{formatCurrency(acc.total)}</div>
              <div className="mt-3 flex gap-6">
                <div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Cash</div>
                  <div className="text-sm font-semibold text-blue-400">{formatCurrency(acc.cash)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Investi</div>
                  <div className="text-sm font-semibold text-emerald-400">{formatCurrency(acc.invested)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card>
          <div className="p-4 border-b border-white/5 font-semibold">Ajouter une opération d'achat</div>
          <InvestmentOperationForm 
            investments={investments} 
            accounts={accounts}
            onSubmit={handleAddOperation} 
            onCancel={() => setShowForm(false)} 
          />
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {investments?.map(inv => {
          const ops = [...(inv.operations || [])].sort((a,b) => new Date(a.date) - new Date(b.date));
          let cumQty = 0;
          let cumAmount = 0;
          
          const rows = ops.map(op => {
            cumQty += op.quantity;
            cumAmount += op.amount;
            const avgPrice = cumQty > 0 ? cumAmount / cumQty : 0;
            return {
              ...op,
              cumQty,
              cumAmount,
              avgPrice
            };
          });

          return (
            <Card key={inv.id} className="overflow-hidden p-0 border-white/10">
              <div className="p-6 border-b border-white/5 bg-zinc-900/40">
                <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  {inv.category}
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {inv.name}
                  {inv.platform && <span className="ml-2 text-sm text-zinc-500 font-normal">sur {inv.platform}</span>}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Investissement total cumulé : <span className="font-medium text-emerald-400">{formatCurrency(inv.invested_amount)}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-zinc-400">
                  <thead className="text-xs text-zinc-500 uppercase bg-zinc-900 border-b border-white/5">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Date</th>
                      <th className="px-5 py-4 font-semibold">Input (€)</th>
                      <th className="px-5 py-4 font-semibold">Prix U. (€)</th>
                      <th className="px-5 py-4 font-semibold">Qté achetée</th>
                      <th className="px-5 py-4 font-semibold">Frais (€)</th>
                      <th className="px-5 py-4 font-semibold">Qté nette</th>
                      <th className="px-5 py-4 font-semibold text-indigo-300">Qté cumulée</th>
                      <th className="px-5 py-4 font-semibold text-emerald-400">Invest. cumulé (€)</th>
                      <th className="px-5 py-4 font-semibold text-blue-300">Prix moy. achat (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-5 py-8 text-center text-zinc-500">Aucune opération enregistrée pour cet actif.</td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">{format(parseISO(row.date), 'dd/MM/yyyy')}</td>
                          <td className="px-5 py-3.5 font-medium text-emerald-400/80">{row.amount.toFixed(2)}</td>
                          <td className="px-5 py-3.5">{row.price.toFixed(2)}</td>
                          <td className="px-5 py-3.5">{row.quantity}</td>
                          <td className="px-5 py-3.5 text-zinc-500">{row.fees.toFixed(2)}</td>
                          <td className="px-5 py-3.5">{row.quantity}</td>
                          <td className="px-5 py-3.5 font-medium text-indigo-300/80">{row.cumQty}</td>
                          <td className="px-5 py-3.5 font-medium text-emerald-400">{row.cumAmount.toFixed(2)}</td>
                          <td className="px-5 py-3.5 font-medium text-blue-300/80">{row.avgPrice.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
