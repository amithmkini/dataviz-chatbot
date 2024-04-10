export const LineBarGraphSkeleton = () => {
  return (
    <div className="h-[375px] rounded-xl border bg-zinc-950 p-4 text-green-400 sm:h-[314px]">
      <div className="animate-pulse flex flex-col space-y-4">
        <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
        <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
        <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
        <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
        <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
      </div>
    </div>
  )
}