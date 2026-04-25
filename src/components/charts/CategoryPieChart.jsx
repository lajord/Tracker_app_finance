'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency, computeCategoryBreakdownRange } from '@/lib/finance';
import { useMemo } from 'react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function CategoryPieChart({ transactions, type = 'expense', startDate, endDate }) {

  const data = useMemo(
    () => {
      // Pour éviter les plantages si la date est invalide pendant la saisie
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s) || isNaN(e)) return [];
      return computeCategoryBreakdownRange(transactions || [], s, e, type);
    },
    [transactions, startDate, endDate, type]
  );

  return (
    <div className="flex flex-col gap-4">
      {!data || data.length === 0 ? (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        {type === 'income' ? 'Aucun revenu enregistré sur cette période' : 'Aucune dépense enregistrée sur cette période'}
      </div>
      ) : (
      <div className="flex h-[280px] w-full items-center gap-4">
        <div className="h-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.name || index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value) => formatCurrency(value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
        {data.map((cat, index) => (
          <div key={cat.name || index} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate text-zinc-300">
                {cat.name}
              </span>
            </div>
            <span className="font-medium text-zinc-100">{formatCurrency(cat.total)}</span>
          </div>
        ))}
      </div>
      </div>
      )}
    </div>
  );
}
