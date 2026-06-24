import { useState } from 'react'
import { ChevronRight, EthernetPort, Plus, Router, Wifi } from 'lucide-react'

import { DeviceDetailModal, NodeDetailModal } from '@/components/network/DetailModals'
import { NetworkHero } from '@/components/network/NetworkHero'
import { Card } from '@/components/ui/card'
import { useDevices } from '@/hooks/useDevices'
import type { NetworkDevice, NetworkNode } from '@/data/types'
import { cn } from '@/lib/utils'

type Tab = 'devices' | 'nodes'

const ROW =
  'flex w-full items-center gap-[14px] rounded-card border border-border bg-card px-[18px] py-[15px] text-left transition-colors hover:bg-card2'

function SegmentedToggle({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const opts: { id: Tab; label: string }[] = [
    { id: 'devices', label: 'Devices' },
    { id: 'nodes', label: 'Nodes' },
  ]
  return (
    <div className="inline-flex rounded-full bg-card2 p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-full px-7 py-2 text-[14px] font-semibold transition-colors',
            tab === o.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ConnectionBadge({ label }: { label: string }) {
  return (
    <span className="rounded-[8px] border border-border-strong px-2.5 py-1 text-[12.5px] text-muted-foreground">
      {label}
    </span>
  )
}

function DeviceRow({ device, onClick }: { device: NetworkDevice; onClick: () => void }) {
  const Icon = device.wired ? EthernetPort : Wifi
  return (
    <button type="button" onClick={onClick} className={ROW}>
      <Icon className="h-[22px] w-[22px] shrink-0 text-muted-foreground" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{device.name}</div>
        {device.subtitle && <div className="truncate text-[12.5px] text-faint">{device.subtitle}</div>}
      </div>
      <ConnectionBadge label={device.connection} />
      <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={2} />
    </button>
  )
}

function DevicesTab({
  node,
  devices,
  clientsError,
  onSelect,
}: {
  node: NetworkNode
  devices: NetworkDevice[]
  clientsError: string | null
  onSelect: (d: NetworkDevice) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center px-1">
        <span className="text-[17px] font-bold">{node.name}</span>
      </div>

      {devices.length === 0 ? (
        <Card className="px-[18px] py-[18px] text-[13px]">
          {clientsError ? (
            <span className="text-status-warn">
              Couldn’t read connected devices from the router: {clientsError}
            </span>
          ) : (
            <span className="text-faint">No devices are connected.</span>
          )}
        </Card>
      ) : (
        devices.map((d) => <DeviceRow key={d.id} device={d} onClick={() => onSelect(d)} />)
      )}
    </div>
  )
}

function NodesTab({ node, onSelect }: { node: NetworkNode; onSelect: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onSelect} className={ROW}>
        <Router className="h-[24px] w-[24px] shrink-0 text-muted-foreground" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{node.name}</div>
          <div className="text-[12.5px] text-faint">{node.role}</div>
        </div>
        <span className="text-[13.5px] text-muted-foreground">
          {node.deviceCount} {node.deviceCount === 1 ? 'device' : 'devices'}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={2} />
      </button>

      <a
        href="https://www.starlink.com/support"
        target="_blank"
        rel="noreferrer"
        className={ROW}
      >
        <Plus className="h-[22px] w-[22px] shrink-0 text-muted-foreground" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Extend WiFi coverage</div>
          <div className="text-[12.5px] text-faint">Learn how to set up mesh</div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={2} />
      </a>
    </div>
  )
}

export function NetworkScreen() {
  const { devices, node, nodeCount, clientsError } = useDevices()
  const [tab, setTab] = useState<Tab>('devices')
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null)
  const [nodeOpen, setNodeOpen] = useState(false)

  const subtitle =
    tab === 'devices'
      ? `${devices.length} ${devices.length === 1 ? 'device' : 'devices'}`
      : `${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-[22px]">
      <NetworkHero deviceCount={devices.length} active={tab === 'devices'} />

      <div className="flex flex-col items-center gap-3">
        <div className="text-[12.5px] text-faint">{subtitle}</div>
        <SegmentedToggle tab={tab} onChange={setTab} />
      </div>

      {tab === 'devices' ? (
        <DevicesTab node={node} devices={devices} clientsError={clientsError} onSelect={setSelectedDevice} />
      ) : (
        <NodesTab node={node} onSelect={() => setNodeOpen(true)} />
      )}

      <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      <NodeDetailModal node={nodeOpen ? node : null} onClose={() => setNodeOpen(false)} />
    </div>
  )
}
