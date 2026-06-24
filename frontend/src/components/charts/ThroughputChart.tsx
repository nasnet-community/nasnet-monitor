import { LineChart } from './LineChart'

interface ThroughputChartProps {
  download: number[]
  upload: number[]
  max?: number
}

export function ThroughputChart({ download, upload, max = 200 }: ThroughputChartProps) {
  return (
    <LineChart
      series={[
        { key: 'dl', label: 'Download', data: download, color: '#22c55e', area: true },
        { key: 'ul', label: 'Upload', data: upload, color: '#3f8cff' },
      ]}
      yMax={max}
      viewWidth={880}
      viewHeight={230}
      padding={28}
      gridValues={[0, 50, 100, 150, 200]}
      xLabels={['00', '06', '12', '18', '24']}
      unit="Mbps"
      xTooltip={(i) => `${String(i).padStart(2, '0')}:00`}
    />
  )
}
