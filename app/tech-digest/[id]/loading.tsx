// app/tech-digest/[id]/loading.tsx
export default function DigestDetailLoading() {
  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      <div className="skeleton h-8 w-20 rounded-[6px] mb-6" />
      <div className="skeleton h-5 w-28 rounded-[9999px] mb-3" />
      <div className="skeleton h-9 w-3/4 rounded-[4px] mb-4" />
      <div className="skeleton h-5 w-full rounded-[4px] mb-2" />
      <div className="skeleton h-5 w-4/5 rounded-[4px] mb-8" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="rounded-[8px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] p-5 space-y-2"
          >
            <div className="skeleton h-5 w-1/2 rounded-[4px]" />
            <div className="skeleton h-4 w-full rounded-[4px]" />
            <div className="skeleton h-4 w-3/4 rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
