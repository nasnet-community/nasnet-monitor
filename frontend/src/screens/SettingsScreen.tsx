import { useEffect, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Switch } from '@/components/ui/switch'
import { useDishControl } from '@/hooks/useDishControl'
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry'
import { useSettings } from '@/hooks/useSettings'
import {
  factoryReset as apiFactoryReset,
  fetchDishStatus,
  getBypassMode as apiGetBypassMode,
  getWifiName as apiGetWifiName,
  getWifiSetupComplete as apiGetWifiSetupComplete,
  routerAddressOrDefault,
  wifiSetup as apiWifiSetup,
} from '@/lib/api'
import { useAppStore } from '@/store/appStore'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-[22px] py-4 text-[13px] font-semibold text-muted-foreground">
        {title}
      </div>
      {children}
    </Card>
  )
}

function Row({
  title,
  description,
  control,
  divider = true,
}: {
  title: string
  description: string
  control: ReactNode
  divider?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between px-[22px] py-[17px] ${divider ? 'border-b border-border' : ''}`}
    >
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-[3px] text-[12.5px] text-faint">{description}</div>
      </div>
      {control}
    </div>
  )
}

function snowMeltLabel(mode: string | null): string {
  switch (mode) {
    case null:
      return '—'
    case 'AUTO':
      return 'Auto'
    case 'ALWAYS_ON':
      return 'On'
    case 'ALWAYS_OFF':
      return 'Off'
    default:
      return mode
  }
}

function minutesToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

type RenamePhase = 'form' | 'reconnect' | 'done'

export function SettingsScreen() {
  const { device } = useSettings()
  const { reboot, stow, inhibitGps, inhibitRf, setSchedule, busy, actionError, dishAddress } =
    useDishControl()
  const { status } = useLiveTelemetry()
  const routerAddress = useAppStore((s) => s.routerAddress)
  const router = routerAddressOrDefault(routerAddress)

  const [wifiName, setWifiName] = useState<string | null>(null)
  const [bypass, setBypass] = useState<boolean | null>(null)
  const [snowMelt, setSnowMelt] = useState<string | null>(null)

  const [sleep, setSleep] = useState(false)
  const [gpsInhibited, setGpsInhibited] = useState(false)
  const rfInhibited = useAppStore((s) => s.rfInhibited)
  const setRfInhibited = useAppStore((s) => s.setRfInhibited)
  const [scheduleOn, setScheduleOn] = useState(false)
  const [scheduleStart, setScheduleStart] = useState(22 * 60)
  const [scheduleDuration, setScheduleDuration] = useState(8 * 60)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [startInput, setStartInput] = useState('22:00')
  const [endInput, setEndInput] = useState('06:00')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const scheduleBusy = busy === 'powersave'

  useEffect(() => {
    let cancelled = false
    apiGetWifiName(router)
      .then((name) => {
        if (!cancelled && name) setWifiName(name)
      })
      .catch(() => {})
    apiGetBypassMode(router)
      .then((on) => {
        if (!cancelled && on !== undefined) setBypass(on)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    let cancelled = false
    fetchDishStatus(dishAddress)
      .then((s) => {
        if (cancelled || !s) return
        if (s.stowRequested !== undefined) setSleep(s.stowRequested)
        if (s.gpsStats?.inhibitGps !== undefined) setGpsInhibited(s.gpsStats.inhibitGps)
        if (s.config?.snowMeltMode !== undefined) setSnowMelt(s.config.snowMeltMode)
        if (s.config?.powerSaveMode !== undefined) setScheduleOn(s.config.powerSaveMode)
        const dur = s.config?.powerSaveDurationMinutes
        if (dur !== undefined && dur > 0) {
          setScheduleDuration(dur)
          setScheduleStart(s.config?.powerSaveStartMinutes ?? 0)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [dishAddress])

  useEffect(() => {
    if (status?.stowRequested !== undefined) setSleep(status.stowRequested)
  }, [status?.stowRequested])
  useEffect(() => {
    if (status?.gpsStats?.inhibitGps !== undefined) setGpsInhibited(status.gpsStats.inhibitGps)
  }, [status?.gpsStats?.inhibitGps])
  useEffect(() => {
    if (status?.config?.powerSaveMode !== undefined) setScheduleOn(status.config.powerSaveMode)
  }, [status?.config?.powerSaveMode])
  useEffect(() => {
    if (status?.config?.snowMeltMode !== undefined) setSnowMelt(status.config.snowMeltMode)
  }, [status?.config?.snowMeltMode])

  const toggleSleep = async (next: boolean) => {
    setSleep(next)
    if (!(await stow(!next))) setSleep(!next)
  }

  const toggleGps = async (next: boolean) => {
    setGpsInhibited(next)
    if (!(await inhibitGps(next))) setGpsInhibited(!next)
  }

  const toggleRf = async (next: boolean) => {
    setRfInhibited(next)
    if (!(await inhibitRf(!next))) setRfInhibited(!next)
  }

  const openScheduleModal = () => {
    setStartInput(minutesToTime(scheduleStart))
    setEndInput(minutesToTime(scheduleStart + scheduleDuration))
    setScheduleError(null)
    setScheduleModalOpen(true)
  }

  const toggleScheduler = (next: boolean) => {
    if (next) {
      openScheduleModal()
      return
    }
    void (async () => {
      setScheduleOn(false)
      if (!(await setSchedule(false, scheduleStart, scheduleDuration))) setScheduleOn(true)
    })()
  }

  const applySchedule = async () => {
    const start = timeToMinutes(startInput)
    const end = timeToMinutes(endInput)
    if (start === null || end === null) {
      setScheduleError('Enter valid times (HH:MM).')
      return
    }
    const duration = (end - start + 1440) % 1440
    if (duration === 0) {
      setScheduleError('Sleep and wake times must differ.')
      return
    }
    setScheduleError(null)
    if (await setSchedule(true, start, duration)) {
      setScheduleStart(start)
      setScheduleDuration(duration)
      setScheduleOn(true)
      setScheduleModalOpen(false)
    } else {
      setScheduleError('The device rejected the schedule.')
    }
  }

  const [renameOpen, setRenameOpen] = useState(false)
  const [phase, setPhase] = useState<RenamePhase>('form')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [enableBypass, setEnableBypass] = useState(false)
  const [ack, setAck] = useState(false)
  const [renameBusy, setRenameBusy] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  const formValid = newName.trim().length > 0 && newPassword.length >= 8 && ack

  const openRename = () => {
    setNewName(wifiName ?? '')
    setNewPassword('')
    setEnableBypass(bypass ?? false)
    setAck(false)
    setRenameError(null)
    setPhase('form')
    setRenameOpen(true)
  }

  const closeRename = () => {
    if (renameBusy) return
    setRenameOpen(false)
  }

  const startReset = async () => {
    if (!formValid) return
    setRenameBusy(true)
    setRenameError(null)
    try {
      await apiFactoryReset(router)
      setPhase('reconnect')
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Factory reset failed.')
    } finally {
      setRenameBusy(false)
    }
  }

  const applySetup = async () => {
    setRenameBusy(true)
    setRenameError(null)
    try {
      const complete = await apiGetWifiSetupComplete(router).catch(() => undefined)
      if (complete === true) {
        throw new Error(
          "The router is still configured — it may still be rebooting, or you're not reconnected to its setup network yet. Wait a moment and try again."
        )
      }
      await apiWifiSetup(router, newName.trim(), newPassword, enableBypass)
      setWifiName(newName.trim())
      setBypass(enableBypass)
      setPhase('done')
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Wi-Fi setup failed.')
    } finally {
      setRenameBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-[22px]">
      <Section title="Network">
        <Row
          title="Wi-Fi name"
          description="Managed in the Starlink app"
          divider={false}
          control={<div className="text-[13.5px] text-muted-foreground">{wifiName ?? '—'}</div>}
        />
      </Section>

      <Section title="Power & behaviour">
        <Row
          title="Bypass mode"
          description="Router bridge mode — change via Factory reset"
          control={
            <div className="text-[13.5px] text-muted-foreground">
              {bypass === null ? '—' : bypass ? 'On' : 'Off'}
            </div>
          }
        />
        <Row
          title="Snow melt"
          description="Heater mode"
          control={
            <div className="text-[13.5px] text-muted-foreground">{snowMeltLabel(snowMelt)}</div>
          }
        />
        <Row
          title="Sleep mode"
          description="Stow the dish to sleep"
          control={
            <Switch
              checked={sleep}
              disabled={busy === 'stow' || busy === 'unstow'}
              onCheckedChange={toggleSleep}
            />
          }
        />
        <div className="flex items-center justify-between border-b border-border px-[22px] py-[17px]">
          <div>
            <div className="text-sm font-medium">Sleep schedule</div>
            {scheduleOn ? (
              <button
                type="button"
                onClick={openScheduleModal}
                className="mt-[3px] text-[12.5px] text-faint underline decoration-dashed underline-offset-2 transition-colors hover:text-muted-foreground"
              >
                {`Power-save ${minutesToTime(scheduleStart)} – ${minutesToTime(scheduleStart + scheduleDuration)}`}
              </button>
            ) : (
              <div className="mt-[3px] text-[12.5px] text-faint">Power-save off</div>
            )}
          </div>
          <Switch checked={scheduleOn} disabled={scheduleBusy} onCheckedChange={toggleScheduler} />
        </div>
        <Row
          title="Disable GPS"
          description="Inhibit the dish's GPS"
          control={
            <Switch
              checked={gpsInhibited}
              disabled={busy === 'inhibit' || busy === 'uninhibit'}
              onCheckedChange={toggleGps}
            />
          }
        />
        <Row
          title="Disable RF transmit"
          description="Stop the dish radiating — it goes offline until re-enabled"
          divider={false}
          control={
            <Switch
              checked={rfInhibited}
              disabled={busy === 'inhibitrf' || busy === 'uninhibitrf'}
              onCheckedChange={toggleRf}
            />
          }
        />
      </Section>

      <Section title="Device">
        <Row
          title="Firmware"
          description="Up to date"
          control={
            <div className="font-mono-nums text-[13.5px] text-muted-foreground">
              {device.firmware}
            </div>
          }
        />
        <div className="flex flex-col gap-2 px-[22px] py-[17px]">
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => reboot()}
              className="h-auto flex-1 rounded-[11px] py-[13px] text-[13.5px]"
            >
              {busy === 'reboot' ? 'Rebooting…' : 'Reboot kit'}
            </Button>
            <Button
              variant="destructive"
              onClick={openRename}
              className="h-auto flex-1 rounded-[11px] py-[13px] text-[13.5px]"
            >
              Factory reset
            </Button>
          </div>
          {actionError && <div className="text-[12.5px] text-status-danger">{actionError}</div>}
        </div>
      </Section>

      <Modal open={renameOpen} onClose={closeRename} title="Factory reset & rename">
        {phase === 'form' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-[10px] border border-status-danger bg-card2 px-3 py-[10px] text-[12.5px] leading-snug text-status-danger">
              The router can only be renamed by factory-resetting it. This{' '}
              <strong>erases all router settings</strong> (bypass mode, client names, DNS, DHCP)
              and <strong>disconnects every device</strong>. The router reboots into setup
              (~2 min); you’ll then reconnect to its default setup network to finish.
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New Wi-Fi name"
              spellCheck={false}
              disabled={renameBusy}
              autoFocus
              className="rounded-[10px] border border-border bg-card2 px-3 py-[10px] text-[14px] outline-none focus:border-primary"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              spellCheck={false}
              disabled={renameBusy}
              className="rounded-[10px] border border-border bg-card2 px-3 py-[10px] text-[14px] outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-muted-foreground">
                Enable bypass (bridge) mode
              </span>
              <Switch
                checked={enableBypass}
                disabled={renameBusy}
                onCheckedChange={setEnableBypass}
              />
            </div>
            <label className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                disabled={renameBusy}
                className="mt-[2px]"
              />
              <span>I understand this factory-resets the router and disconnects all devices.</span>
            </label>
            {renameError && <div className="text-[12.5px] text-status-danger">{renameError}</div>}
            <div className="mt-1 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={renameBusy}
                onClick={closeRename}
                className="h-auto rounded-[10px] px-4 py-2 text-[13px]"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={renameBusy || !formValid}
                onClick={startReset}
                className="h-auto rounded-[10px] px-4 py-2 text-[13px]"
              >
                {renameBusy ? 'Resetting…' : 'Factory-reset & rename'}
              </Button>
            </div>
          </div>
        )}

        {phase === 'reconnect' && (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] leading-snug text-muted-foreground">
              Factory reset sent. The router is rebooting into setup mode (~2 min) and your
              connection to it has dropped. On this machine, <strong>reconnect to the router’s
              default setup Wi-Fi network</strong>, then apply the new name below.
            </div>
            {renameError && <div className="text-[12.5px] text-status-danger">{renameError}</div>}
            <div className="mt-1 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={renameBusy}
                onClick={closeRename}
                className="h-auto rounded-[10px] px-4 py-2 text-[13px]"
              >
                Close
              </Button>
              <Button
                disabled={renameBusy}
                onClick={applySetup}
                className="h-auto rounded-[10px] px-4 py-2 text-[13px]"
              >
                {renameBusy ? 'Applying…' : "I’ve reconnected — apply name"}
              </Button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] leading-snug text-muted-foreground">
              {enableBypass ? (
                <>
                  Done. Bypass (bridge) mode is enabled — the Starlink router no longer broadcasts
                  Wi-Fi. Connect your own router to it and use that network instead.
                </>
              ) : (
                <>
                  Done. The network is now <strong>{newName.trim()}</strong>. Reconnect your devices
                  using the new name and password.
                </>
              )}
            </div>
            <div className="mt-1 flex justify-end">
              <Button
                onClick={closeRename}
                className="h-auto rounded-[10px] px-4 py-2 text-[13px]"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={scheduleModalOpen}
        onClose={() => !scheduleBusy && setScheduleModalOpen(false)}
        title="Sleep schedule"
      >
        <div className="flex flex-col gap-3">
          <div className="text-[12.5px] text-faint">
            The dish enters power-save (sleep) during this window each day.
          </div>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-[12.5px] text-muted-foreground">
              Sleep at
              <input
                type="time"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                disabled={scheduleBusy}
                className="rounded-[10px] border border-border bg-card2 px-3 py-[10px] text-[14px] outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-[12.5px] text-muted-foreground">
              Wake at
              <input
                type="time"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                disabled={scheduleBusy}
                className="rounded-[10px] border border-border bg-card2 px-3 py-[10px] text-[14px] outline-none focus:border-primary"
              />
            </label>
          </div>
          {scheduleError && <div className="text-[12.5px] text-status-danger">{scheduleError}</div>}
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={scheduleBusy}
              onClick={() => setScheduleModalOpen(false)}
              className="h-auto rounded-[10px] px-4 py-2 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              disabled={scheduleBusy}
              onClick={applySchedule}
              className="h-auto rounded-[10px] px-4 py-2 text-[13px]"
            >
              {scheduleBusy ? 'Saving…' : 'Apply'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
