export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-white/5 bg-zinc-900/60 backdrop-blur p-5 shadow-lg shadow-black/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, titleClassName }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className={titleClassName || "text-sm font-medium text-zinc-400"}>{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
