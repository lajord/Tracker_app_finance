export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</span>}
      <input
        className={`min-h-11 w-full rounded-xl border border-white/5 bg-zinc-900/70 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</span>}
      <select
        className={`min-h-11 w-full rounded-xl border border-white/5 bg-zinc-900/70 px-3 py-2.5 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
