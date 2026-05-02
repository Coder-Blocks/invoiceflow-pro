type Props = {
  title: string;
  value: string;
  subtitle?: string;
};

export function StatsCard({ title, value, subtitle }: Props) {
  return (
    <div className="glass-card rounded-3xl p-5 blue-glow">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-900">{value}</h3>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}