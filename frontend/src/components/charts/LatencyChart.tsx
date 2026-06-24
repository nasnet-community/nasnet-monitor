import { LineChart } from './LineChart'

interface LatencyChartProps {
  data: number[]
  max?: number
  color?: string
}

export function LatencyChart({ data, max = 60, color = '#f59e0b' }: LatencyChartProps) {
  return (
    <LineChart
      series={[{ key: 'latency', label: 'Latency', data, color }]}
      yMax={max}
      viewWidth={560}
      viewHeight={200}
      padding={26}
      gridValues={[0, 20, 40, 60]}
      unit="ms"
      xTooltip={(i) => `${String(i).padStart(2, '0')}:00`}
    />
  )
}
