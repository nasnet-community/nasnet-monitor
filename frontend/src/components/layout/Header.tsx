import { ChevronDown, Moon, Sun, User } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import {
  DropdownMenu,
  DropdownMenuCheckIcon,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NAV_ITEMS } from '@/constants/navigation'
import { useDeviceState } from '@/hooks/useDeviceState'
import { useTheme } from '@/hooks/useTheme'

function useActiveNav() {
  const { pathname } = useLocation()
  return (
    NAV_ITEMS.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path))) ??
    NAV_ITEMS[0]
  )
}

/** Header: route title + theme toggle + device-state simulator menu + profile. */
export function Header() {
  const active = useActiveNav()
  const { isDark, toggleTheme } = useTheme()
  const { meta, options, setDeviceState } = useDeviceState()

  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-[18px] md:px-[30px]">
      <span className="text-xl font-semibold tracking-[-0.02em]">{active.title}</span>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-card2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {isDark ? (
            <Moon className="h-[17px] w-[17px]" strokeWidth={1.8} />
          ) : (
            <Sun className="h-[17px] w-[17px]" strokeWidth={1.8} />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Simulate device state"
              className="flex items-center gap-2 rounded-full border border-border-strong bg-card py-[7px] pl-[13px] pr-[11px] text-foreground transition-colors data-[state=open]:bg-card2"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: meta.color, boxShadow: `0 0 9px ${meta.color}` }}
              />
              <span className="text-[12.5px] font-medium">{meta.label}</span>
              <ChevronDown
                className="h-[13px] w-[13px] text-faint transition-transform group-data-[state=open]:rotate-180"
                strokeWidth={2}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[206px]">
            <DropdownMenuLabel>Simulate state</DropdownMenuLabel>
            {options.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => setDeviceState(o.id)}>
                <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                <span className="flex-1 text-left">{o.label}</span>
                {o.active && (
                  <DropdownMenuCheckIcon className="h-3.5 w-3.5 text-primary" strokeWidth={2.6} />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-card2">
          <User className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.8} />
        </div>
      </div>
    </header>
  )
}
