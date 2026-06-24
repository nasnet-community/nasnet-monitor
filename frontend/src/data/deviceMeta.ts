import type { DeviceState, StateMeta } from './types'

export const STATE_META: Record<DeviceState, StateMeta> = {
  online: {
    label: 'Online',
    color: '#22c55e',
    sub: 'Connected and streaming from the satellite constellation.',
    uplink: 'Uplink active',
  },
  booting: {
    label: 'Booting',
    color: '#f59e0b',
    sub: 'Searching for satellites — this usually takes a minute.',
    uplink: 'Acquiring signal',
  },
  sleeping: {
    label: 'Sleeping',
    color: '#f59e0b',
    sub: 'Low-power mode · the panel is idle to save energy.',
    uplink: 'Low-power mode',
  },
  stowed: {
    label: 'Stowed',
    color: '#a1a1aa',
    sub: 'Panel folded flat for transport or storage.',
    uplink: 'Link stowed',
  },
  obstructed: {
    label: 'Obstructed',
    color: '#ef4444',
    sub: 'A partial sky blockage is interrupting the signal.',
    uplink: 'Signal blocked',
  },
  offline: {
    label: 'Offline',
    color: '#ef4444',
    sub: 'No signal from the dish. Check that it is powered and the cable is seated.',
    uplink: 'No uplink',
  },
}
