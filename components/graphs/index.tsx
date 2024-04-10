'use client'

import dynamic from 'next/dynamic'
import { LineBarGraphSkeleton } from './graph-skeleton'

const LineBarGraph = dynamic(
  () => import('@/components/graphs/graph').then(mod => mod.LineBarGraph),
  {
    ssr: false,
    loading: () => <LineBarGraphSkeleton />
  }
)

export { LineBarGraph }
