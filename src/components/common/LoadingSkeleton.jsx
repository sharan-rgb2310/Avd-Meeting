const Line = ({ w = 'w-full', h = 'h-3' }) => <div className={`skeleton ${h} ${w}`} />

const LoadingSkeleton = ({ variant = 'page', rows = 5, cards = 4 }) => {
  if (variant === 'table') {
    return (
      <div className="p-4" aria-busy="true" aria-label="Loading data">
        <div className="mb-4 flex gap-3">
          <Line w="w-40" h="h-4" />
          <Line w="w-24" h="h-4" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-8 w-8 rounded-full" />
              <Line w="w-1/4" />
              <Line w="w-1/6" />
              <Line w="w-1/5" />
              <Line w="w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'stats') {
    return (
      <div className="grid gap-3 sm:grid-cols-3" aria-busy="true">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <Line w="w-24" />
              <div className="skeleton h-8 w-8 rounded-lg" />
            </div>
            <Line w="w-16" h="h-7" />
            <div className="mt-3">
              <Line w="w-28" h="h-2.5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'kanban') {
    return (
      <div className="grid gap-4 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-3">
            <Line w="w-24" h="h-4" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="rounded-xl border border-line p-3">
                  <Line w="w-3/4" />
                  <div className="mt-2 flex gap-2">
                    <Line w="w-12" h="h-2.5" />
                    <Line w="w-16" h="h-2.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Line w="w-56" h="h-6" />
      <Line w="w-80" h="h-3" />
      <div className="card p-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Line key={i} w={i % 2 ? 'w-2/3' : 'w-full'} />
        ))}
      </div>
    </div>
  )
}

export default LoadingSkeleton
