import React, { useRef, useEffect, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

interface GraphProps {
  label1: string;
  label2?: string;
  x: string[];
  y1: number[];
  y2?: number[];
  type: 'line' | 'bar';
}

const GraphComponent: React.FC<GraphProps> = ({ label1, label2, x, y1, y2, type }) => {
  const chartRef = useRef<Chart | null>(null);

  const data = useMemo(() => ({
    labels: x,
    datasets: [
      {
        label: label1,
        data: y1,
        yAxisID: 'y1',
      },
      y2
        ? {
            label: label2,
            data: y2,
            yAxisID: 'y2',
          }
        : null,
    ].filter(Boolean),
  }), [x, y1, y2, label1, label2]);

  const options = useMemo(() => ({
    scales: {
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: false,
        min: Math.min(...y1) - 1,
        max: Math.max(...y1) + 1,
        title: {
          display: true,
          text: label1,
        },
      },
      y2: {
        type: 'linear',
        display: y2 ? true : false,
        position: 'right',
        beginAtZero: false,
        min: y2 ? Math.min(...y2) - 1 : undefined,
        max: y2 ? Math.max(...y2) + 1 : undefined,
        title: {
          display: y2 ? true : false,
          text: label2,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  }), [label1, label2, y1, y2]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data = data;
      chartRef.current.options = options;
      chartRef.current.update();
    }
  }, [data, options]);

  return (
    <div>
      <h1>{`${label1}${label2 ? `, ${label2}` : ''} Chart`}</h1>
      <div style={{ width: '80%', height: '500px', margin: '0 auto' }}>
        {type === 'line' && (
          <Line data={data} options={options} ref={chartRef} />
        )}
        {type === 'bar' && (
          <Bar data={data} options={options} ref={chartRef} />
        )}
      </div>
    </div>
  );
};

export default GraphComponent;