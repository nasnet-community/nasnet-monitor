import { LineChart } from './LineChart'

interface PowerChartProps {
  data: number[]
  max?: number
}

export function PowerChart({ data, max = 150 }: PowerChartProps) {
  return (
    <LineChart
      series={[{ key: 'power', label: 'Power draw', data, color: '#a855f7', area: true }]}
      yMax={max}
      viewWidth={560}
      viewHeight={200}
      padding={28}
      gridValues={[0, 50, 100, 150]}
      unit="W"
      xTooltip={(i) => `${String(i).padStart(2, '0')}:00`}
    />
  )
}
