export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700">
      <p className="text-sm">{title} — coming soon</p>
    </div>
  );
}
