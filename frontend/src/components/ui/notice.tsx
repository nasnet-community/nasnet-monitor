import { AlertTriangle, Info } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Notice({ tone, children }: { tone: 'info' | 'warn'; children: React.ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-5 py-3 text-[14px] font-medium',
        tone === 'warn'
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : 'border-border bg-card/60 text-muted-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
      {children}
    </div>
  )
}
