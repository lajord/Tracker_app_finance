'use client';

import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { formatShort, formatCurrency, computeIncomeExpenseRange } from '@/lib/finance';

export function IncomeExpenseChart({ transactions, startDate, endDate }) {

  const data = useMemo(
    () => {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s) || isNaN(e)) return [];
      return computeIncomeExpenseRange(transactions || [], startDate, endDate);
    },
    [transactions, startDate, endDate]
  );

  const isDaily = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s) || isNaN(e)) return false;
    return differenceInDays(e, s) <= 60;
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Revenus & Dépenses</h3>
          <p className="text-sm text-zinc-400">Historique des flux financiers</p>
        </div>
      </div>
      <div className="mt-4 h-72 min-w-0 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} minTickGap={20} />
            <YAxis tickFormatter={(v) => formatShort(v)} tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: '#27272a', opacity: 0.4 }}
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
              itemStyle={{ fontSize: '13px' }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '13px' }}
              formatter={(val) => formatCurrency(val)}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
            <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="net" name="Reste à vivre" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="income" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
