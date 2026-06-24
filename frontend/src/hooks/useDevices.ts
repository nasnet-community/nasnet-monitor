import { toNetworkDevices, toNetworkNode } from '@/data/starlink'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useDevices() {
  const { status, clients, clientIndex, clientsError } = useLiveTelemetry()
  const devices = toNetworkDevices(clients, clientIndex)
  const node = toNetworkNode(status, devices.length)

  return {
    devices,
    deviceCount: devices.length,
    node,
    nodeCount: 1,
    clientsError,
  }
}
