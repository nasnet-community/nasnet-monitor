import { LineChart } from './LineChart'

interface PingSuccessChartProps {
  data: number[]
}

export function PingSuccessChart({ data }: PingSuccessChartProps) {
  return (
    <LineChart
      series={[{ key: 'ping', label: 'Ping success', data, color: '#22c55e', area: true }]}
      yMax={100}
      viewWidth={560}
      viewHeight={200}
      padding={28}
      gridValues={[0, 25, 50, 75, 100]}
      unit="%"
      xTooltip={(i) => `${String(i).padStart(2, '0')}:00`}
    />
  )
}
