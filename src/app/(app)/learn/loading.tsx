export default function LearnLoading() {
  return (
    <div className="space-y-8" aria-label="Đang tải danh mục học">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-60 animate-pulse rounded-2xl border bg-card" />
        ))}
      </div>
    </div>
  );
}
