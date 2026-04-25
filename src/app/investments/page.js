'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InvestmentOperationForm } from '@/components/InvestmentOperationForm';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency, computeAccountWealth } from '@/lib/finance';

export default function InvestmentsPage() {
  const { investments, updateInvestment, addInvestment, accounts, transactions } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);

  const investmentAccounts = useMemo(() => {
    const investmentTypeAccounts = (accounts || []).filter((account) => account.type === 'investment');
    return computeAccountWealth(investmentTypeAccounts, investments, transactions).accounts;
  }, [accounts, transactions, investments]);

  const handleAddOperation = async (data) => {
    let targetInvestment;

    if (data.isNew) {
      targetInvestment = await addInvestment({
        name: data.assetName,
        platform: data.platform,
        category: 'ETF',
        invested_amount: 0,
        operations: [],
      });
    } else {
      targetInvestment = investments.find((investment) => investment.id === data.investmentId);
    }

    if (!targetInvestment) {
      throw new Error('Investissement introuvable');
    }

    const newOperations = [
      ...(targetInvestment.operations || []),
      {
        date: data.date,
        amount: data.amount,
        price: data.price,
        quantity: data.quantity,
        fees: data.fees,
      },
    ];

    const newAmount = newOperations.reduce((sum, operation) => sum + operation.amount, 0);

    await updateInvestment(targetInvestment.id, {
      operations: newOperations,
      invested_amount: newAmount,
    });

    setShowForm(false);
  };

  const total = investments?.reduce((sum, investment) => sum + Number(investment.invested_amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Investissements</h1>
          <p className="text-sm text-zinc-400">Capital immobilise / investi</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-400">{formatCurrency(total)}</div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Fermer' : '+ Operation'}</Button>
        </div>
      </div>

      {investmentAccounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {investmentAccounts.map((account) => (
            <Card key={account.id} className="p-5">
              <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{account.name}</div>
              <div className="mt-3 text-2xl font-bold text-white">{formatCurrency(account.total)}</div>
              <div className="mt-3 flex gap-6">
                <div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Cash</div>
                  <div className="text-sm font-semibold text-blue-400">{formatCurrency(account.cash)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Investi</div>
                  <div className="text-sm font-semibold text-emerald-400">{formatCurrency(account.invested)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card>
          <div className="border-b border-white/5 p-4 font-semibold">Ajouter une operation d&apos;achat</div>
          <InvestmentOperationForm
            investments={investments}
            accounts={accounts}
            onSubmit={handleAddOperation}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {investments?.map((investment) => {
          const operations = [...(investment.operations || [])].sort(
            (left, right) => new Date(left.date) - new Date(right.date)
          );
          let cumulativeQuantity = 0;
          let cumulativeAmount = 0;

          const rows = operations.map((operation) => {
            cumulativeQuantity += operation.quantity;
            cumulativeAmount += operation.amount;
            const averagePrice = cumulativeQuantity > 0 ? cumulativeAmount / cumulativeQuantity : 0;

            return {
              ...operation,
              cumulativeQuantity,
              cumulativeAmount,
              averagePrice,
            };
          });

          return (
            <Card key={investment.id} className="overflow-hidden border-white/10 p-0">
              <div className="border-b border-white/5 bg-zinc-900/40 p-6">
                <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  {investment.category}
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {investment.name}
                  {investment.platform && (
                    <span className="ml-2 text-sm font-normal text-zinc-500">sur {investment.platform}</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Investissement total cumule :{' '}
                  <span className="font-medium text-emerald-400">{formatCurrency(investment.invested_amount)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="border-b border-white/5 bg-zinc-900 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Date</th>
                      <th className="px-5 py-4 font-semibold">Input (EUR)</th>
                      <th className="px-5 py-4 font-semibold">Prix U. (EUR)</th>
                      <th className="px-5 py-4 font-semibold">Qte achetee</th>
                      <th className="px-5 py-4 font-semibold">Frais (EUR)</th>
                      <th className="px-5 py-4 font-semibold">Qte nette</th>
                      <th className="px-5 py-4 font-semibold text-indigo-300">Qte cumulee</th>
                      <th className="px-5 py-4 font-semibold text-emerald-400">Invest. cumule (EUR)</th>
                      <th className="px-5 py-4 font-semibold text-blue-300">Prix moy. achat (EUR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-5 py-8 text-center text-zinc-500">
                          Aucune operation enregistree pour cet actif.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr key={index} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/5">
                          <td className="whitespace-nowrap px-5 py-3.5">{format(parseISO(row.date), 'dd/MM/yyyy')}</td>
                          <td className="px-5 py-3.5 font-medium text-emerald-400/80">{row.amount.toFixed(2)}</td>
                          <td className="px-5 py-3.5">{row.price.toFixed(2)}</td>
                          <td className="px-5 py-3.5">{row.quantity}</td>
                          <td className="px-5 py-3.5 text-zinc-500">{row.fees.toFixed(2)}</td>
                          <td className="px-5 py-3.5">{row.quantity}</td>
                          <td className="px-5 py-3.5 font-medium text-indigo-300/80">{row.cumulativeQuantity}</td>
                          <td className="px-5 py-3.5 font-medium text-emerald-400">{row.cumulativeAmount.toFixed(2)}</td>
                          <td className="px-5 py-3.5 font-medium text-blue-300/80">{row.averagePrice.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
