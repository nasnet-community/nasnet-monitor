import { Modal } from '@/components/ui/modal'
import type { NetworkDevice, NetworkNode } from '@/data/types'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-faint">{label}</span>
      <span className="text-right font-mono-nums text-[13px] text-foreground">{value}</span>
    </div>
  )
}

function formatMb(mb: number | null): string {
  if (mb == null) return '—'
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${Math.round(mb)} MB`
}

export function DeviceDetailModal({ device, onClose }: { device: NetworkDevice | null; onClose: () => void }) {
  return (
    <Modal open={device != null} onClose={onClose} title={device?.name ?? 'Device'}>
      {device && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <Row label="Connection" value={device.connection} />
            {device.isThisDevice && <Row label="Status" value="This device" />}
            <Row label="IP address" value={device.ip ?? '—'} />
            <Row label="MAC address" value={device.mac ?? '—'} />
            {!device.wired && (
              <Row label="Signal" value={device.signal != null ? `${device.signal} dBm` : '—'} />
            )}
            <Row label="Downloaded" value={formatMb(device.downloadMb)} />
            <Row label="Uploaded" value={formatMb(device.uploadMb)} />
          </div>
          <div className="text-[12px] text-faint">
            Device names are managed in the Starlink app — the dish’s local API doesn’t allow renaming
            connected clients.
          </div>
        </div>
      )}
    </Modal>
  )
}

export function NodeDetailModal({ node, onClose }: { node: NetworkNode | null; onClose: () => void }) {
  return (
    <Modal open={node != null} onClose={onClose} title={node?.name ?? 'Node'}>
      {node && (
        <div className="flex flex-col">
          <Row label="Role" value={node.role} />
          <Row label="Hardware" value={node.hardwareVersion} />
          <Row label="Firmware" value={node.firmware} />
          <Row label="Serial" value={node.serial} />
          <Row label="Connected devices" value={String(node.deviceCount)} />
        </div>
      )}
    </Modal>
  )
}
