export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-indigo-600 text-white shadow-indigo-900/30 hover:bg-indigo-500',
    secondary: 'border border-white/5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
    ghost: 'text-zinc-300 hover:bg-zinc-800/70',
    danger: 'bg-red-600/90 text-white hover:bg-red-500',
  };

  const sizes = {
    sm: 'min-h-10 px-3 py-2 text-xs',
    md: 'min-h-11 px-4 py-2.5 text-sm',
    lg: 'min-h-12 px-5 py-3 text-base',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
