export function SkeletonBlock({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBlock
          key={index}
          className={`h-3.5 ${index === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'h-12 w-12' }) {
  return <SkeletonBlock className={`shrink-0 rounded-full ${size}`} />;
}

export function SkeletonImage({ className = '' }) {
  return <SkeletonBlock className={`rounded-none ${className}`} />;
}

export function SkeletonCard({ children, className = '' }) {
  return <div aria-hidden="true" className={`card overflow-hidden ${className}`}>{children}</div>;
}

export function SkeletonTableRow({ columns = 4 }) {
  return (
    <div
      aria-hidden="true"
      className="grid gap-4 border-b border-line px-4 py-3 last:border-0 sm:px-5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }, (_, index) => (
        <SkeletonBlock key={index} className={`h-4 ${index === 0 ? 'w-4/5' : 'w-3/5'}`} />
      ))}
    </div>
  );
}

export function SkeletonPageHeader({ withSubtitle = true }) {
  return (
    <div aria-hidden="true" className="mb-7 border-b border-line pb-5">
      <SkeletonBlock className="h-8 w-56 max-w-full" />
      {withSubtitle && <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />}
    </div>
  );
}

export function SkeletonStatus({ label = 'Loading page content' }) {
  return (
    <div role="status" aria-label={label} aria-live="polite">
      <span className="sr-only">{label}</span>
      <span className="sr-only">Please wait.</span>
    </div>
  );
}
