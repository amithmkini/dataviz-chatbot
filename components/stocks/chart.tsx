'use client'

import GraphComponent from '@/components/graphs/graph';
import { weatherData } from '@/lib/utils';

interface Stock {
  symbol: string
  price: number
  delta: number
}

export function Stock({ props: { symbol, price, delta } }: { props: Stock }) {

  const x = weatherData.map((data) => data.date);
  const y1 = weatherData.map((data) => data.averageTemperature);
  const y2 = weatherData.map((data) => data.averageHumidity);
  const label1 = 'avgTemp';
  const label2 = 'avgHumidity'

  return (
    <div>
      <GraphComponent label1={label1} label2={label2} x={x} y1={y1} y2={y2} type="line" />
      {/* <GraphComponent label1={label1} x={x} y1={y1} type="line" /> */}
      {/* <GraphComponent label1={label1} x={x} y1={y1} type="line" /> */}
    </div>
  )
}
