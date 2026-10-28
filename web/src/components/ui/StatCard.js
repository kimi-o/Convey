import Skeleton from "@/components/ui/Skeleton";

export default function StatCard({ label, value, loading = false }) {
  return (
    <div className="border border-white/10 bg-card px-5 py-4">
      <p className="text-xs text-ink-3">{label}</p>
      {loading
        ? <Skeleton className="mt-3 h-7 w-12" />
        : <p className="mt-2 text-2xl font-medium tabular-nums text-ink">{value}</p>}
    </div>
  );
}