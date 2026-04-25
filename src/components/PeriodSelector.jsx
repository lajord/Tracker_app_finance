'use client';

import { PERIODS } from '@/lib/finance';

export function PeriodSelector({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-white/5 bg-zinc-900/60 p-1">
      {Object.entries(PERIODS).map(([key, p]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === key
              ? 'bg-indigo-600 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
