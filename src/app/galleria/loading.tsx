export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-10" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl animate-pulse aspect-square" />
        ))}
      </div>
    </div>
  );
}
