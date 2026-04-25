'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency, computeCategoryBreakdownRange } from '@/lib/finance';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function CategoryPieChart({ transactions, type = 'expense', startDate, endDate }) {
  const [mounted, setMounted] = useState(false);
  const data = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    return computeCategoryBreakdownRange(transactions || [], start, end, type);
  }, [transactions, startDate, endDate, type]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-center text-sm text-zinc-500 sm:h-64">
        {type === 'income'
          ? 'Aucun revenu enregistre sur cette periode'
          : 'Aucune depense enregistree sur cette periode'}
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-[220px] w-full sm:h-[280px]" />;
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      <div className="h-[220px] min-w-0 w-full lg:h-[280px] lg:flex-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
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

      <div className="flex w-full flex-col gap-2 lg:max-h-[280px] lg:flex-1 lg:overflow-y-auto lg:pr-2">
        {data.map((category, index) => (
          <div
            key={category.name || index}
            className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950/40 px-3 py-2 text-xs"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate text-zinc-300">{category.name}</span>
            </div>
            <span className="shrink-0 font-medium text-zinc-100">{formatCurrency(category.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
