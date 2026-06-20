/** Lightweight fallback shown while a lazy-loaded route chunk is fetched. */
export function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
