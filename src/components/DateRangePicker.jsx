import { subMonths, subYears, format, startOfMonth } from 'date-fns';

export function DateRangePicker({ startDate, setStartDate, endDate, setEndDate }) {
  const handlePreset = (months) => {
    const end = new Date();
    const start = months === 1 ? startOfMonth(end) : months === 12 ? subYears(end, 1) : subMonths(end, months);
    setEndDate(format(end, 'yyyy-MM-dd'));
    setStartDate(format(start, 'yyyy-MM-dd'));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-lg p-0.5">
        <button onClick={() => handlePreset(1)} className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">1M</button>
        <button onClick={() => handlePreset(3)} className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">3M</button>
        <button onClick={() => handlePreset(6)} className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">6M</button>
        <button onClick={() => handlePreset(12)} className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">1Y</button>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-zinc-900/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors [color-scheme:dark]"
        />
        <span className="text-zinc-600 text-xs font-medium px-1">à</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-zinc-900/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors [color-scheme:dark]"
        />
      </div>
    </div>
  );
}
