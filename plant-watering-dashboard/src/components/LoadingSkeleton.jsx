export default function LoadingSkeleton({ kind = 'plant' }) {
  return <div className={`skeleton skeleton-${kind}`} role="status" aria-label={`Loading ${kind} data`}>
    <span className="sr-only">Loading {kind} data</span>
    <span className="skeleton-line" /><span className="skeleton-value" />
    {kind !== 'summary' && <><span className="skeleton-line" /><div className="skeleton-grid">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div></>}
  </div>;
}
