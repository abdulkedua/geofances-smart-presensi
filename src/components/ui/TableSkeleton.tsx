

export default function TableSkeleton() {
  return (
    <div className="animate-pulse flex flex-col space-y-4">
      <div className="h-10 bg-gray-200 rounded w-full"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <div className="h-8 bg-gray-200 rounded col-span-1"></div>
            <div className="h-8 bg-gray-200 rounded col-span-1"></div>
            <div className="h-8 bg-gray-200 rounded col-span-1"></div>
            <div className="h-8 bg-gray-200 rounded col-span-1"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
