import { Bell, ChevronRight, LogOut, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { causeTone, formatDuration, formatWhen } from '@/components/stats/outageFormat'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NAV_ITEMS, type NavItem } from '@/constants/navigation'
import { useDeviceState } from '@/hooks/useDeviceState'
import { useStats } from '@/hooks/useStats'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

function useActiveNav() {
  const { pathname } = useLocation()
  return (
    NAV_ITEMS.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path))) ??
    NAV_ITEMS[0]
  )
}

function MobileNav({ active }: { active: NavItem }) {
  const navigate = useNavigate()
  const disconnect = useAppStore((s) => s.disconnect)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-card2 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground md:hidden"
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[210px]">
        {NAV_ITEMS.map(({ id, label, path, icon: Icon }) => (
          <DropdownMenuItem
            key={id}
            onSelect={() => navigate(path)}
            className={cn(active.id === id && 'bg-[var(--nav-active)] text-foreground')}
          >
            <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => disconnect()}>
          <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
          Exit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const active = useActiveNav()
  const navigate = useNavigate()
  const { meta } = useDeviceState()
  const { events } = useStats()
  const disconnect = useAppStore((s) => s.disconnect)
  const recent = events.slice(0, 5)

  return (
    <header className="relative flex items-center justify-between gap-3 border-b border-border px-5 py-2 md:px-[30px] md:py-[18px]">
      <div className="flex min-w-0 items-center gap-2.5">
        <img
          src="/assets/logo.png"
          alt="Nasnet logo"
          width={30}
          height={30}
          className="h-[30px] w-[30px] shrink-0 rounded-[8px] object-contain md:hidden"
          style={{ boxShadow: '0 0 14px rgba(34,197,94,0.3)' }}
        />
        <span className="hidden truncate text-xl font-semibold tracking-[-0.02em] md:block">
          {active.title}
        </span>
      </div>

      <span className="pointer-events-none absolute left-1/2 max-w-[52%] -translate-x-1/2 truncate text-base font-semibold tracking-[-0.02em] md:hidden">
        {active.title}
      </span>

      <div className="flex shrink-0 items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Alerts"
              className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-card2 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground md:flex"
            >
              <Bell className="h-[17px] w-[17px]" strokeWidth={1.8} />
              {events.length > 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-warn" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[290px] p-0">
            <DropdownMenuLabel className="px-3.5 pt-3">Recent events</DropdownMenuLabel>
            {recent.length === 0 ? (
              <div className="px-3.5 pb-3.5 pt-1 text-[13px] text-faint">
                No outages recorded recently.
              </div>
            ) : (
              <>
                <ul className="px-1.5 pb-1.5">
                  {recent.map((e, i) => (
                    <li
                      key={`${e.startMs ?? 'na'}-${i}`}
                      className="flex items-center gap-2.5 rounded-[9px] px-2 py-2"
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', causeTone(e.cause))} />
                      <span className="text-[13px] font-medium">{e.cause}</span>
                      <span className="ml-auto font-mono-nums text-[12px] font-medium text-foreground">
                        {formatDuration(e.durationS)}
                      </span>
                      <span className="font-mono-nums text-[11.5px] text-faint">
                        {formatWhen(e.startMs)}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/events')}
                  className="flex w-full items-center justify-center gap-1 border-t border-border px-3.5 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Show all events
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Live device state"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-card text-foreground transition-colors hover:text-foreground md:hidden"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: meta.color, boxShadow: `0 0 9px ${meta.color}` }}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex min-w-0 items-center gap-2 px-3 py-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: meta.color, boxShadow: `0 0 9px ${meta.color}` }}
            />
            <span className="text-[13px] font-medium">{meta.label}</span>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          title="Live device state"
          className="hidden items-center gap-2 rounded-full border border-border-strong bg-card py-[7px] pl-[13px] pr-[14px] text-foreground md:flex"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: meta.color, boxShadow: `0 0 9px ${meta.color}` }}
          />
          <span className="text-[12.5px] font-medium">{meta.label}</span>
        </div>

        <button
          onClick={() => disconnect()}
          title="Exit"
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-card2 text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>

        <MobileNav active={active} />
      </div>
    </header>
  )
}
