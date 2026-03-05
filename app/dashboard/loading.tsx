export default function DashboardLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
      ))}
    </div>
  );
}
