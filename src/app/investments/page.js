'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InvestmentOperationForm } from '@/components/InvestmentOperationForm';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency, computeAccountWealth } from '@/lib/finance';

function AdjustCashModal({ account, onSave, onCancel }) {
  const [cash, setCash] = useState(account.cash || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(account, Number(cash));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-white">Ajuster le solde Cash</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Pour le compte <span className="font-semibold text-white">{account.name}</span>
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Nouveau solde réel (€)</label>
            <input
              type="number"
              step="0.01"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/50 p-2.5 text-white placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onCancel} className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">Enregistrer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function EditInvestmentModal({ investment, onSave, onCancel }) {
  const [name, setName] = useState(investment.name);
  const [platform, setPlatform] = useState(investment.platform || '');
  const [category, setCategory] = useState(investment.category || 'ETF');
  const [investedAmount, setInvestedAmount] = useState(investment.invested_amount || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(investment.id, { name, platform, category, invested_amount: Number(investedAmount) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-white">Éditer l'investissement</h2>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Nom de l'actif</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/50 p-2.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Plateforme</label>
            <input
              type="text"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/50 p-2.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Catégorie</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/50 p-2.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Montant investi (€)</label>
            <input
              type="number"
              step="0.01"
              value={investedAmount}
              onChange={(e) => setInvestedAmount(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-900/50 p-2.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onCancel} className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">Enregistrer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function InvestmentsPage() {
  const { investments, updateInvestment, addInvestment, deleteInvestment, accounts, transactions, updateAccount } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);
  const [adjustingAccount, setAdjustingAccount] = useState(null);
  const [editingInvestment, setEditingInvestment] = useState(null);

  const investmentAccounts = useMemo(() => {
    const investmentTypeAccounts = (accounts || []).filter((account) => account.type === 'investment');
    return computeAccountWealth(investmentTypeAccounts, investments, transactions).accounts;
  }, [accounts, transactions, investments]);

  const handleAdjustCash = async (account, newCashValue) => {
    const accTxs = transactions.filter((t) => t.account_id === account.id);
    const flow = accTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    const newInitialBalance = newCashValue - flow;
    await updateAccount(account.id, { initial_balance: newInitialBalance });
    setAdjustingAccount(null);
  };

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

    if (!targetInvestment) throw new Error('Investissement introuvable');

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

  const handleEditInvestment = async (id, patch) => {
    await updateInvestment(id, patch);
    setEditingInvestment(null);
  };

  const handleDeleteInvestment = async (id) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet investissement et tout son historique ?")) {
      await deleteInvestment(id);
    }
  };

  const handleDeleteOperation = async (investmentId, operationIndex) => {
    if (confirm("Voulez-vous supprimer cette opération ?")) {
      const investment = investments.find((i) => i.id === investmentId);
      if (!investment) return;

      const operations = investment.operations || [];
      // On retrie avant de supprimer pour s'assurer que l'index correspond à l'affichage
      const sortedOperations = [...operations].sort((a, b) => new Date(a.date) - new Date(b.date));
      const newOperations = sortedOperations.filter((_, i) => i !== operationIndex);
      const newAmount = newOperations.reduce((sum, op) => sum + op.amount, 0);

      await updateInvestment(investmentId, {
        operations: newOperations,
        invested_amount: newAmount,
      });
    }
  };

  const total = investments?.reduce((sum, investment) => sum + Number(investment.invested_amount), 0) || 0;

  return (
    <div className="space-y-6">
      {adjustingAccount && (
        <AdjustCashModal
          account={adjustingAccount}
          onSave={handleAdjustCash}
          onCancel={() => setAdjustingAccount(null)}
        />
      )}

      {editingInvestment && (
        <EditInvestmentModal
          investment={editingInvestment}
          onSave={handleEditInvestment}
          onCancel={() => setEditingInvestment(null)}
        />
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Investissements</h1>
          <p className="text-sm text-zinc-400">Capital immobilisé et suivi des opérations</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:w-auto">
          <div className="text-left sm:text-right">
            <div className="text-3xl font-bold text-emerald-400">{formatCurrency(total)}</div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
            {showForm ? 'Fermer' : 'Ajouter une opération'}
          </Button>
        </div>
      </div>

      {investmentAccounts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {investmentAccounts.map((account) => (
            <Card key={account.id}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{account.name}</div>
                <button
                  onClick={() => setAdjustingAccount(account)}
                  className="rounded bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Ajuster Cash
                </button>
              </div>
              <div className="mt-3 text-2xl font-bold text-white">{formatCurrency(account.total)}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Cash" value={formatCurrency(account.cash)} valueClassName="text-blue-400" />
                <MetricCard label="Investi" value={formatCurrency(account.invested)} valueClassName="text-emerald-400" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/5 px-4 py-4 font-semibold sm:px-5">Ajouter une opération d&apos;achat</div>
          <InvestmentOperationForm
            investments={investments}
            accounts={accounts}
            onSubmit={handleAddOperation}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {investments?.map((investment) => {
          const operations = [...(investment.operations || [])].sort(
            (left, right) => new Date(left.date) - new Date(right.date)
          );

          let cumulativeQuantity = 0;
          let cumulativeAmount = 0;

          const rows = operations.map((operation, index) => {
            cumulativeQuantity += operation.quantity;
            cumulativeAmount += operation.amount;
            const averagePrice = cumulativeQuantity > 0 ? cumulativeAmount / cumulativeQuantity : 0;

            return {
              ...operation,
              originalIndex: index,
              cumulativeQuantity,
              cumulativeAmount,
              averagePrice,
            };
          });

          const displayRows = [...rows].reverse();

          return (
            <Card key={investment.id} className="overflow-hidden border-white/10 p-0 group">
              <div className="border-b border-white/5 bg-zinc-900/40 p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                      {investment.category}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {investment.name}
                      {investment.platform && (
                        <span className="mt-1 block text-sm font-normal text-zinc-500 sm:ml-2 sm:mt-0 sm:inline">
                          sur {investment.platform}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Investissement total cumulé :{' '}
                      <span className="font-medium text-emerald-400">{formatCurrency(investment.invested_amount)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    <button
                      onClick={() => setEditingInvestment(investment)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                      title="Éditer l'investissement"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvestment(investment.id)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                      title="Supprimer l'investissement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {displayRows.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">
                  Aucune opération enregistrée pour cet actif.
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 md:hidden">
                    {displayRows.map((row) => (
                      <div key={row.originalIndex} className="rounded-2xl border border-white/5 bg-zinc-950/30 p-4 relative">
                        <button
                          onClick={() => handleDeleteOperation(investment.id, row.originalIndex)}
                          className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex items-start justify-between gap-3 pr-8">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Date</div>
                            <div className="text-sm font-medium text-zinc-100">
                              {format(parseISO(row.date), 'dd/MM/yyyy')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">Input</div>
                            <div className="text-sm font-semibold text-emerald-400">{row.amount.toFixed(2)} EUR</div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <MetricCard label="Prix U." value={`${row.price.toFixed(2)} EUR`} />
                          <MetricCard label="Qté achetée" value={String(row.quantity)} />
                          <MetricCard label="Frais" value={`${row.fees.toFixed(2)} EUR`} />
                          <MetricCard label="Qté nette" value={String(row.quantity)} />
                          <MetricCard label="Qté cumulée" value={String(row.cumulativeQuantity)} valueClassName="text-indigo-300" />
                          <MetricCard
                            label="Invest. cumulé"
                            value={`${row.cumulativeAmount.toFixed(2)} EUR`}
                            valueClassName="text-emerald-400"
                          />
                          <MetricCard
                            label="Prix moy."
                            value={`${row.averagePrice.toFixed(2)} EUR`}
                            valueClassName="text-blue-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block pb-2">
                    <table className="w-full min-w-[860px] text-left text-sm text-zinc-400">
                      <thead className="border-b border-white/5 bg-zinc-900 text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="px-5 py-4 font-semibold">Date</th>
                          <th className="px-5 py-4 font-semibold">Input (EUR)</th>
                          <th className="px-5 py-4 font-semibold">Prix U. (EUR)</th>
                          <th className="px-5 py-4 font-semibold">Qté achetée</th>
                          <th className="px-5 py-4 font-semibold">Frais (EUR)</th>
                          <th className="px-5 py-4 font-semibold">Qté nette</th>
                          <th className="px-5 py-4 font-semibold text-indigo-300">Qté cumulée</th>
                          <th className="px-5 py-4 font-semibold text-emerald-400">Invest. cumulé (EUR)</th>
                          <th className="px-5 py-4 font-semibold text-blue-300">Prix moy. (EUR)</th>
                          <th className="px-5 py-4 font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((row) => (
                          <tr
                            key={row.originalIndex}
                            className="group/row border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                          >
                            <td className="whitespace-nowrap px-5 py-3.5">{format(parseISO(row.date), 'dd/MM/yyyy')}</td>
                            <td className="px-5 py-3.5 font-medium text-emerald-400/80">{row.amount.toFixed(2)}</td>
                            <td className="px-5 py-3.5">{row.price.toFixed(2)}</td>
                            <td className="px-5 py-3.5">{row.quantity}</td>
                            <td className="px-5 py-3.5 text-zinc-500">{row.fees.toFixed(2)}</td>
                            <td className="px-5 py-3.5">{row.quantity}</td>
                            <td className="px-5 py-3.5 font-medium text-indigo-300/80">{row.cumulativeQuantity}</td>
                            <td className="px-5 py-3.5 font-medium text-emerald-400">{row.cumulativeAmount.toFixed(2)}</td>
                            <td className="px-5 py-3.5 font-medium text-blue-300/80">{row.averagePrice.toFixed(2)}</td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => handleDeleteOperation(investment.id, row.originalIndex)}
                                className="opacity-0 transition-opacity group-hover/row:opacity-100 text-zinc-500 hover:text-red-400"
                                title="Supprimer l'opération"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value, valueClassName = 'text-zinc-100' }) {
  return (
    <div className="rounded-xl bg-zinc-950/35 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${valueClassName}`}>{value}</div>
    </div>
  );
}
