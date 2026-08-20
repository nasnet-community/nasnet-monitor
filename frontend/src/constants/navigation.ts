import {
  Bell,
  Crosshair,
  Gauge,
  Home,
  Radio,
  Settings,
  Stethoscope,
  TrendingUp,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'

import type { ScreenId } from '@/data/types'

export interface NavItem {
  id: ScreenId
  label: string
  title: string
  subtitle: string
  path: string
  icon: LucideIcon
  requiresRouter?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', title: 'Overview', subtitle: 'Live status of your Nasnet Mini Kit', path: '/', icon: Home },
  { id: 'stats', label: 'Statistics', title: 'Statistics', subtitle: 'Speed, latency and uptime trends', path: '/statistics', icon: TrendingUp },
  { id: 'events', label: 'Events', title: 'Events & outages', subtitle: 'Connectivity interruptions recorded by the kit', path: '/events', icon: Bell },
  { id: 'speedtest', label: 'Speed test', title: 'Speed test', subtitle: 'Measure your live download, upload and latency', path: '/speed-test', icon: Gauge, requiresRouter: true },
  { id: 'network', label: 'Network', title: 'Network', subtitle: 'Devices connected to Nasnet-Home', path: '/network', icon: Radio, requiresRouter: true },
  { id: 'obstructions', label: 'Obstructions', title: 'Obstructions', subtitle: 'Sky coverage and signal interruptions', path: '/obstructions', icon: CircleDot },
  { id: 'alignment', label: 'Alignment', title: 'Alignment', subtitle: 'Kit orientation and aim quality', path: '/alignment', icon: Crosshair },
  { id: 'diagnostics', label: 'Diagnostics', title: 'Diagnostics', subtitle: 'Dish diagnostic snapshot and radio telemetry', path: '/diagnostics', icon: Stethoscope },
  { id: 'settings', label: 'Settings', title: 'Settings', subtitle: 'Manage your kit and network', path: '/settings', icon: Settings },
]
