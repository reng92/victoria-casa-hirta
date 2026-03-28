export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-10" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl p-4 animate-pulse h-20" />
        ))}
      </div>
    </div>
  );
}
