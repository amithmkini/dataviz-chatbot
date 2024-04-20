'use client'

import React, { useRef, useEffect, useMemo } from 'react';
import { Doughnut, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { PieDoughnutProps } from '@/lib/types';
Chart.register(...registerables);

export function PieChart(
  { props: { title, type, labels, tooltip, dataset } }:
  { props: PieDoughnutProps }) {
  const chartRef = useRef<Chart<any> | null>(null)

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: tooltip,
        data: dataset
      }
    ]
  }), [labels, dataset, tooltip])

  const options = useMemo(() => ({
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    animations: false
  }), [title])

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data = data
      chartRef.current.update();
    }
  }, [data])

  return (
    <div>
      <div className='flex p-4 border justify-center'>
      {type === 'pie' && (
          <Pie
            data={data}
            options={options as any}
            ref={chartRef} />
        )}
        {type === 'doughnut' && (
          <Doughnut
            data={data}
            options={options as any}
            ref={chartRef} />
        )}
      </div>
    </div>
  )
}