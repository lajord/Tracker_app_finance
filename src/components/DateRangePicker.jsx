import { subMonths, subYears, format, startOfMonth } from 'date-fns';

const presets = [
  { label: '1M', value: 1 },
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '1Y', value: 12 },
];

export function DateRangePicker({ startDate, setStartDate, endDate, setEndDate }) {
  const handlePreset = (months) => {
    const end = new Date();
    const start =
      months === 1 ? startOfMonth(end) : months === 12 ? subYears(end, 1) : subMonths(end, months);

    setEndDate(format(end, 'yyyy-MM-dd'));
    setStartDate(format(start, 'yyyy-MM-dd'));
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto">
      <div className="no-scrollbar overflow-x-auto">
        <div className="inline-flex min-w-full items-center rounded-xl border border-white/10 bg-zinc-900/80 p-1 sm:min-w-0">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePreset(preset.value)}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="min-h-11 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm font-medium text-zinc-300 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="min-h-11 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm font-medium text-zinc-300 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
        />
      </div>
    </div>
  );
}
