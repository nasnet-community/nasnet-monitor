import { NavLink } from 'react-router-dom'

import { NAV_ITEMS } from '@/constants/navigation'
import { useDeviceState } from '@/hooks/useDeviceState'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

function BrandMark() {
  return (
    <div className="flex items-center gap-[11px] px-2 pb-5 pt-1.5">
      <img
        src="/assets/logo.png"
        alt="Nasnet logo"
        width={34}
        height={34}
        className="h-[34px] w-[34px] rounded-[9px] object-contain"
        style={{ boxShadow: '0 0 18px rgba(34,197,94,0.35)' }}
      />
      <div className="flex flex-col leading-[1.05]">
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Nasnet</span>
        <span className="text-[11.5px] font-medium text-faint">Monitor</span>
      </div>
    </div>
  )
}

function DeviceCard() {
  const { meta } = useDeviceState()
  const { device } = useSettings()
  return (
    <div className="rounded-[13px] border border-border bg-card px-[14px] py-[13px]">
      <div className="flex items-center gap-[9px]">
        <span
          className="h-2 w-2 animate-nas-pulse rounded-full"
          style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
        />
        <span className="text-[13px] font-semibold">{device.model}</span>
      </div>
      <div className="mt-[5px] font-mono-nums text-[11.5px] text-faint">SN&nbsp;{device.serial}</div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col gap-1.5 border-r border-border bg-surface px-4 py-[22px] md:flex md:h-screen md:overflow-y-auto">
      <BrandMark />

      {NAV_ITEMS.map(({ id, label, path, icon: Icon }) => (
        <NavLink
          key={id}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            cn(
              'flex w-full items-center gap-3 rounded-[11px] px-[13px] py-[11px] text-sm font-medium transition-colors',
              isActive
                ? 'bg-[var(--nav-active)] text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}

      <div className="flex-1" />
      <DeviceCard />
    </aside>
  )
}
