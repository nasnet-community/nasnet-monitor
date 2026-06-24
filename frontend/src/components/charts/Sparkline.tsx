import { LineChart } from './LineChart'

interface SparklineProps {
  data: number[]
  max?: number
  color?: string
  height?: number
}

export function Sparkline({ data, max = 100, color = '#22c55e', height = 56 }: SparklineProps) {
  return (
    <LineChart
      series={[{ key: 'signal', label: 'Signal', data, color, area: true }]}
      yMax={max}
      viewWidth={300}
      viewHeight={56}
      padding={0}
      strokeWidth={2}
      fixedHeight={height}
      unit="%"
    />
  )
}
