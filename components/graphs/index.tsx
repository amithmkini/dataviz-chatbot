'use client'

import dynamic from 'next/dynamic'
import { LineBarGraphSkeleton } from './graph-skeleton'
import { PieSkeleton } from './pie-skeleton'

const LineBarGraph = dynamic(
  () => import('@/components/graphs/graph').then(mod => mod.LineBarGraph),
  {
    ssr: false,
    loading: () => <LineBarGraphSkeleton />
  }
)

const PieChart = dynamic(
  () => import('@/components/graphs/pie').then(mod => mod.PieChart),
  {
    ssr: false,
    loading: () => <PieSkeleton />
  }
)

export { LineBarGraph, PieChart }
