export default function AppLoading() {
  return (
    <div className="space-y-5" aria-label="Đang tải">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
