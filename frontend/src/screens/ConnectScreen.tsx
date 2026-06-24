import { useState } from 'react'
import { Loader2, Radar, SatelliteDish } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEFAULT_DISH_ADDRESS, DEFAULT_DISH_HOST, checkDish, withDishPort } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

export function ConnectScreen() {
  const connected = useAppStore((s) => s.connected)
  const savedAddress = useAppStore((s) => s.dishAddress)
  const setConnected = useAppStore((s) => s.setConnected)
  const setDishAddress = useAppStore((s) => s.setDishAddress)
  const navigate = useNavigate()

  const [host, setHost] = useState((savedAddress || DEFAULT_DISH_HOST).replace(/:\d+$/, ''))
  const [showManual, setShowManual] = useState(false)
  const [busy, setBusy] = useState<'scan' | 'manual' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (connected) return <Navigate to="/" replace />

  const connect = async (target: string, mode: 'scan' | 'manual') => {
    const dish = target.trim()
    if (!dish) return
    setBusy(mode)
    setError(null)
    try {
      await checkDish(dish)
      setDishAddress(dish)
      setConnected(true)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the dish')
    } finally {
      setBusy(null)
    }
  }

  const disabled = busy !== null

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-5 text-foreground">
      <Card className="flex w-full max-w-[420px] flex-col gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/assets/logo.png"
            alt="Nasnet logo"
            width={44}
            height={44}
            className="h-[44px] w-[44px] rounded-[11px] object-contain"
            style={{ boxShadow: '0 0 20px rgba(34,197,94,0.35)' }}
          />
          <div>
            <div className="text-[20px] font-semibold tracking-[-0.02em]">Nasnet Monitor</div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Scan for your kit on the local network.
            </div>
          </div>
        </div>

        <Button
          disabled={disabled}
          onClick={() => connect(DEFAULT_DISH_ADDRESS, 'scan')}
          className="h-auto gap-2 py-[14px] text-sm"
        >
          {busy === 'scan' ? (
            <Loader2 className="h-[17px] w-[17px] animate-spin" strokeWidth={1.9} />
          ) : (
            <Radar className="h-[17px] w-[17px]" strokeWidth={1.9} />
          )}
          {busy === 'scan' ? 'Scanning…' : 'Scan for dish'}
        </Button>

        {error && (
          <div
            className="rounded-[10px] px-3 py-[10px] text-center text-[12.5px] text-status-danger"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            {error}
          </div>
        )}

        {showManual ? (
          <div className="flex flex-col gap-2">
            <label
              className="text-[12.5px] font-medium text-muted-foreground"
              htmlFor="dish-address"
            >
              Dish IP address
            </label>
            <div className="flex gap-2">
              <input
                id="dish-address"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connect(withDishPort(host), 'manual')}
                placeholder={DEFAULT_DISH_HOST}
                spellCheck={false}
                disabled={disabled}
                autoFocus
                className="min-w-0 flex-1 rounded-[10px] border border-border bg-card2 px-3 py-[10px] font-mono-nums text-[13px] outline-none focus:border-primary"
              />
              <Button
                variant="outline"
                disabled={disabled || !host.trim()}
                onClick={() => connect(withDishPort(host), 'manual')}
                className="h-auto gap-2 px-4 py-[10px] text-sm"
              >
                {busy === 'manual' ? (
                  <Loader2 className="h-[16px] w-[16px] animate-spin" strokeWidth={1.9} />
                ) : (
                  <SatelliteDish className="h-[16px] w-[16px]" strokeWidth={1.9} />
                )}
                Connect
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="text-center text-[12.5px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Enter address manually
          </button>
        )}
      </Card>

      <footer className="text-center text-[12px] text-faint">
        Nasnet Monitor · Satellite-dish monitoring ·{' '}
        <span className="font-mono-nums">v{import.meta.env.VITE_APP_VERSION ?? '0.1.0'}</span>
      </footer>
    </div>
  )
}
