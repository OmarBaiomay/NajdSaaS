/** Thin indeterminate progress bar (a sweeping highlight, not a real
 * percentage — the bisecting fetch has no reliable "% done" to report).
 * Used wherever data is actively being fetched, so it's visually obvious
 * something is happening instead of just a line of muted text. */
export function LoadingBar() {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full w-1/3 animate-loading-sweep rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
    </div>
  );
}
