// Loading skeleton components for better UX

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      {children}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <CardSkeleton>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>
    </CardSkeleton>
  );
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-3 px-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <CardSkeleton>
      <div className="mb-4">
        <Skeleton className="h-6 w-40 mb-2" />
      </div>
      <div className="h-80 flex items-center justify-center">
        <div className="w-full max-w-sm">
          {/* Simulate chart elements */}
          <div className="flex items-end justify-center space-x-2 mb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton 
                key={index} 
                className="w-8" 
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
          <div className="flex justify-center space-x-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </CardSkeleton>
  );
}

export function MovementCardSkeleton() {
  return (
    <CardSkeleton className="border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="w-8 h-8" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
    </CardSkeleton>
  );
}

export function MetaCardSkeleton() {
  return (
    <CardSkeleton>
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="w-6 h-6" />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>

        <Skeleton className="w-full h-3 rounded-full" />

        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>

        <Skeleton className="w-full h-9 rounded-lg" />
      </div>
    </CardSkeleton>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 md:space-y-8 px-2 md:px-0">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Recent Movements Skeleton */}
      <CardSkeleton>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <MovementCardSkeleton key={index} />
          ))}
        </div>
      </CardSkeleton>
    </div>
  );
}

export function MetasPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      {/* Metas Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <MetaCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function MovimientosPageSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters Skeleton */}
      <CardSkeleton>
        <Skeleton className="h-6 w-16 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
      </CardSkeleton>

      {/* Movements Table Skeleton */}
      <CardSkeleton>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {Array.from({ length: 5 }).map((_, index) => (
                  <th key={index} className="text-left py-3 px-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, index) => (
                <TableRowSkeleton key={index} columns={5} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <MovementCardSkeleton key={index} />
          ))}
        </div>
      </CardSkeleton>
    </div>
  );
}
