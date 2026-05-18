// app/tech-digest/loading.tsx
// Next.js skill: Use loading.tsx for async routes instead of inline loading state

export default function TechDigestLoading() {
  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="skeleton h-6 w-28 rounded-[9999px] mb-3" />
        <div className="skeleton h-9 w-64 rounded-[4px] mb-2" />
        <div className="skeleton h-5 w-80 rounded-[4px]" />
      </div>
      {/* Card skeletons */}
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="rounded-[12px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] p-6 space-y-3"
          >
            <div className="skeleton h-4 w-20 rounded-[4px]" />
            <div className="skeleton h-6 w-3/4 rounded-[4px]" />
            <div className="skeleton h-4 w-full rounded-[4px]" />
            <div className="skeleton h-4 w-2/3 rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
