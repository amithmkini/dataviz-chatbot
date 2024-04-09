import React, { useRef, useEffect, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import type { ChartData, ChartDataset, ChartOptions } from 'chart.js';
import { LineBarGraphProps } from '@/lib/types';
Chart.register(...registerables);

type LineOrBarData = ChartData<'line'> | ChartData<'bar'>;
type LineOrBarOptions = ChartOptions<'line'> | ChartOptions<'bar'>;


export function LineBarGraph({ props: { title, type, x, y1, y2 } }: { props: LineBarGraphProps }) {
  const chartRef = useRef<Chart<any> | null>(null);

  const data = useMemo<LineOrBarData>(() => ({
    labels: x.data,
    datasets: [
      {
        label: y1.label,
        data: y1.data,
        yAxisID: 'y1',
      },
      y2
        ? {
            label: y2.label,
            data: y2.data,
            yAxisID: 'y2',
          }
        : null,
    ].filter(Boolean) as ChartDataset<'line'>[],
  }), [x, y1, y2]);

  const options = useMemo<LineOrBarOptions>(() => ({
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: false,
        min: Math.min(...y1.data) - 1,
        max: Math.max(...y1.data) + 1,
        title: {
          display: true,
          text: y1.label,
        },
      },
      y2: {
        type: 'linear',
        display: y2 ? true : false,
        position: 'right',
        beginAtZero: false,
        min: y2 ? Math.min(...y2.data) - 1 : undefined,
        max: y2 ? Math.max(...y2.data) + 1 : undefined,
        title: {
          display: y2 ? true : false,
          text: y2?.label,
        },
      },
      x: {
        title: {
          display: true,
          text: x.label,
        },
      },
    },
  }), [x, y1, y2, title]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data = data;
      chartRef.current.options = options;
      chartRef.current.update();
    }
  }, [data, options]);

  return (
    <div>
      <div className='flex p-4 border justify-center'>
        {type === 'line' && (
          <Line 
            data={data as ChartData<'line'>}
            options={options as ChartOptions<'line'>}
            ref={chartRef} />
        )}
        {type === 'bar' && (
          <Bar 
            data={data as ChartData<'bar'>}
            options={options as ChartOptions<'bar'>}
            ref={chartRef} />
        )}
      </div>
    </div>
  );
};

export default LineBarGraph;