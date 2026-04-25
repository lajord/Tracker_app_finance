'use client';

import { useEffect, useMemo, useState } from 'react';
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

const CustomTooltip = ({ active, payload }) => {
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
  const [mounted, setMounted] = useState(false);
  const data = useMemo(
    () =>
      computeCapitalEvolutionRange(
        accounts || [],
        investments || [],
        transactions || [],
        startDate,
        endDate
      ),
    [accounts, investments, transactions, startDate, endDate]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!data?.length) {
    return (
      <div className="flex h-[240px] w-full items-center justify-center text-center text-sm text-zinc-500 sm:h-[300px]">
        Pas assez de donnees pour afficher l&apos;evolution.
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-[240px] w-full sm:h-[300px]" />;
  }

  return (
    <div className="h-[240px] min-w-0 w-full sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
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
  );
}
