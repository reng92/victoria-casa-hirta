export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-gray-100 rounded-2xl animate-pulse h-40 mb-6" />
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl animate-pulse h-24" />
        ))}
      </div>
    </div>
  );
}
