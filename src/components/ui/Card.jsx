export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-white/5 bg-zinc-900/60 p-4 shadow-lg shadow-black/20 backdrop-blur sm:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, titleClassName }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3 className={titleClassName || 'text-sm font-medium text-zinc-400'}>{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action && <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </div>
  );
}
