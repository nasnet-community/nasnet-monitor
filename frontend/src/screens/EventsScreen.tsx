import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  causeTone,
  formatDuration,
  formatWhen,
  isBenignCause,
} from '@/components/stats/outageFormat'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OutageEvent } from '@/data/types'
import { useStats } from '@/hooks/useStats'
import { cn } from '@/lib/utils'

type SortKey = 'cause' | 'type' | 'duration' | 'started'
type SortDir = 'asc' | 'desc'

function sortValue(e: OutageEvent, key: SortKey): string | number {
  switch (key) {
    case 'cause':
      return e.cause.toLowerCase()
    case 'type':
      return isBenignCause(e.cause) ? 0 : 1
    case 'duration':
      return e.durationS
    case 'started':
      return e.startMs ?? 0
  }
}

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'cause', label: 'Cause', align: 'left' },
  { key: 'type', label: 'Type', align: 'left' },
  { key: 'duration', label: 'Duration', align: 'right' },
  { key: 'started', label: 'Started', align: 'right' },
]

export function EventsScreen() {
  const { events } = useStats()
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'started', dir: 'desc' })

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'cause' ? 'asc' : 'desc' }
    )
  }

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...events].sort((a, b) => {
      const av = sortValue(a, sort.key)
      const bv = sortValue(b, sort.key)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [events, sort])

  return (
    <Card className="px-6 py-[22px]">
      <div className="mb-[18px] text-[15px] font-semibold">Events &amp; outages</div>

      {events.length === 0 ? (
        <div className="text-[13px] text-faint">No outages recorded recently.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((col) => {
                const activeSort = sort.key === col.key
                const Icon = !activeSort ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
                return (
                  <TableHead key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'group inline-flex items-center gap-1.5 transition-colors hover:text-foreground',
                        col.align === 'right' && 'flex-row-reverse',
                        activeSort && 'text-foreground'
                      )}
                    >
                      {col.label}
                      <Icon
                        className={cn(
                          'h-3 w-3 transition-opacity',
                          activeSort ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'
                        )}
                        strokeWidth={2}
                      />
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((e, i) => (
              <TableRow key={`${e.startMs ?? 'na'}-${i}`}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2.5">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', causeTone(e.cause))} />
                    {e.cause}
                  </span>
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">
                  {isBenignCause(e.cause) ? 'Routine' : 'Fault'}
                </TableCell>
                <TableCell className="text-right font-mono-nums font-medium">
                  {formatDuration(e.durationS)}
                </TableCell>
                <TableCell className="text-right font-mono-nums text-faint">
                  {formatWhen(e.startMs)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
