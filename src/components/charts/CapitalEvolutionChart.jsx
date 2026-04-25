'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatShort, computeCapitalEvolutionRange } from '@/lib/finance';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useMemo } from 'react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/90 p-3 shadow-xl backdrop-blur-md">
        <p className="mb-2 text-sm font-medium text-zinc-400">{payload[0].payload.monthFull}</p>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-emerald-400">
            Capital net: {formatCurrency(payload[0].value)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function CapitalEvolutionChart({ accounts, investments, transactions, startDate, endDate }) {

  const data = useMemo(
    () => computeCapitalEvolutionRange(accounts || [], investments || [], transactions || [], startDate, endDate),
    [accounts, investments, transactions, startDate, endDate]
  );

  if (!data?.length) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-sm text-zinc-500">
        Pas assez de données pour afficher l'évolution.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="month" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#a1a1aa', fontSize: 12 }} 
            dy={10} 
            minTickGap={20}
          />
          <YAxis 
            tickFormatter={(v) => formatShort(v)} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#a1a1aa', fontSize: 12 }} 
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="capital"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCapital)"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
