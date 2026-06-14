import {
  Crosshair,
  Home,
  Radio,
  Settings,
  TrendingUp,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'

import type { ScreenId } from '@/data/types'

export interface NavItem {
  id: ScreenId
  label: string
  /** Header title shown for the route. */
  title: string
  subtitle: string
  path: string
  icon: LucideIcon
}

/** Sidebar navigation + per-route header copy, mirroring the comp's titles/subs. */
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', title: 'Overview', subtitle: 'Live status of your Nasnet Mini Kit', path: '/', icon: Home },
  { id: 'stats', label: 'Statistics', title: 'Statistics', subtitle: 'Speed, latency and uptime trends', path: '/statistics', icon: TrendingUp },
  { id: 'network', label: 'Network', title: 'Network', subtitle: 'Devices connected to Nasnet-Home', path: '/network', icon: Radio },
  { id: 'obstructions', label: 'Obstructions', title: 'Obstructions', subtitle: 'Sky coverage and signal interruptions', path: '/obstructions', icon: CircleDot },
  { id: 'alignment', label: 'Alignment', title: 'Alignment', subtitle: 'Kit orientation and aim quality', path: '/alignment', icon: Crosshair },
  { id: 'settings', label: 'Settings', title: 'Settings', subtitle: 'Manage your kit and network', path: '/settings', icon: Settings },
]
