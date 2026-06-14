import { DEVICES, NETWORK_SUMMARY } from '@/data/mock'

/** Connected client devices + network summary for the Network screen. */
export function useDevices() {
  return {
    devices: DEVICES,
    deviceCount: DEVICES.length,
    networkName: NETWORK_SUMMARY.networkName,
    totalThroughput: NETWORK_SUMMARY.totalThroughput,
  }
}
