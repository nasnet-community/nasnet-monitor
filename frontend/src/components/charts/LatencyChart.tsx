import { LineChart } from './LineChart'

interface LatencyChartProps {
  data: number[]
  max?: number
  color?: string
}

const GRID_STEP = 20

export function LatencyChart({ data, max, color = '#f59e0b' }: LatencyChartProps) {
  const peak = Math.max(60, ...data)
  const yMax = max ?? Math.ceil(peak / GRID_STEP) * GRID_STEP
  const gridValues = Array.from({ length: yMax / GRID_STEP + 1 }, (_, i) => i * GRID_STEP)
  return (
    <LineChart
      series={[{ key: 'latency', label: 'Latency', data, color }]}
      yMax={yMax}
      viewWidth={560}
      viewHeight={200}
      padding={26}
      gridValues={gridValues}
      unit="ms"
      xTooltip={(i) => `${String(i).padStart(2, '0')}:00`}
    />
  )
}
