'use client';

import { formatCurrency } from '@/lib/finance';

const statusStyles = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  danger: 'bg-orange-500',
  over: 'bg-red-500',
};

const statusLabels = {
  ok: 'OK',
  warn: 'Attention',
  danger: 'Limite proche',
  over: 'Depasse',
};

export function BudgetProgress({ item, onDelete }) {
  const pct = Math.min(item.percent, 100);

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span>{item.category.icon}</span>
            <span className="truncate text-sm font-medium text-zinc-100">{item.category.name}</span>
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
              item.status === 'over'
                ? 'bg-red-500/20 text-red-300'
                : item.status === 'danger'
                  ? 'bg-orange-500/20 text-orange-300'
                  : item.status === 'warn'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {statusLabels[item.status]}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="rounded-lg px-2 py-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
              title="Supprimer"
            >
              x
            </button>
          )}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${statusStyles[item.status]}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-col gap-1 text-[11px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{item.percent.toFixed(0)}% utilises</span>
        <span>
          {item.remaining >= 0
            ? `${formatCurrency(item.remaining)} restants`
            : `${formatCurrency(Math.abs(item.remaining))} de depassement`}
        </span>
      </div>
    </div>
  );
}
