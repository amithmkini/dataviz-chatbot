'use client'

import dynamic from 'next/dynamic'
import { LineBarGraphSkeleton } from './graph-skeleton'
import { SqlOutputSkeleton } from './sql-output-skeleton'
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

const SqlOutputDialog = dynamic(
  () => import('@/components/graphs/sql-output-dialog').then(mod => mod.SqlOutputDialog),
  {
    ssr: false,
    loading: () => <SqlOutputSkeleton />
  }
)

export { LineBarGraph, PieChart, SqlOutputDialog }
