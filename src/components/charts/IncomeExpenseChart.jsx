'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { formatShort, formatCurrency, computeIncomeExpenseRange } from '@/lib/finance';

const legendItems = [
  { label: 'Depenses', color: 'bg-red-500' },
  { label: 'Reste a vivre', color: 'bg-blue-500' },
  { label: 'Revenus', color: 'bg-emerald-500' },
];

export function IncomeExpenseChart({ transactions, startDate, endDate }) {
  const [mounted, setMounted] = useState(false);
  const data = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    return computeIncomeExpenseRange(transactions || [], startDate, endDate);
  }, [transactions, startDate, endDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">Revenus et depenses</h3>
          <p className="text-sm text-zinc-400">Historique des flux financiers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {legendItems.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-950/50 px-3 py-1.5 text-xs text-zinc-300"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 h-[260px] min-w-0 w-full sm:h-72">
        {!mounted ? (
          <div className="h-full w-full" />
        ) : (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              dy={10}
              minTickGap={20}
            />
            <YAxis
              tickFormatter={(value) => formatShort(value)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: '#27272a', opacity: 0.4 }}
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
              itemStyle={{ fontSize: '13px' }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '13px' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Bar dataKey="expenses" name="Depenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="net" name="Reste a vivre" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="income" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
