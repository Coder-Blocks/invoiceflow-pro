export default function SkeletonCard() {
  return (
    <div className="premium-card p-5">
      <div className="skeleton h-4 w-28 rounded" />
      <div className="skeleton mt-4 h-8 w-40 rounded" />
      <div className="skeleton mt-4 h-3 w-full rounded" />
    </div>
  );
}