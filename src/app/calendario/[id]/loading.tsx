export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-gray-100 rounded-2xl animate-pulse h-64 mb-6" />
      <div className="bg-gray-100 rounded-2xl animate-pulse h-48 mb-6" />
    </div>
  );
}
