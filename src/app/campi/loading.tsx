export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl animate-pulse h-64" />
        ))}
      </div>
    </div>
  );
}
