import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'

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

export function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme()
  const { settings, toggle, device, network } = useSettings()

  return (
    <div className="flex max-w-[760px] flex-col gap-[22px]">
      <Section title="Appearance">
        <Row
          title="Dark mode"
          description="Switch between light and dark themes"
          divider={false}
          control={<Switch checked={isDark} onCheckedChange={toggleTheme} />}
        />
      </Section>

      <Section title="Network">
        <Row
          title="Wi-Fi name"
          description="Visible to nearby devices"
          control={
            <div className="font-mono-nums text-[13.5px] text-muted-foreground">
              {network.networkName}
            </div>
          }
        />
        <Row
          title="Password"
          description="WPA3 secured"
          divider={false}
          control={<div className="text-[15px] tracking-[2px] text-muted-foreground">••••••••••</div>}
        />
      </Section>

      <Section title="Power & behaviour">
        <Row
          title="Sleep schedule"
          description="Kit sleeps 10:00 PM – 6:00 AM"
          control={<Switch checked={settings.sleep} onCheckedChange={() => toggle('sleep')} />}
        />
        <Row
          title="Auto-align"
          description="Re-aim automatically when moved"
          control={
            <Switch checked={settings.autoalign} onCheckedChange={() => toggle('autoalign')} />
          }
        />
        <Row
          title="Outage alerts"
          description="Push a notification on disconnect"
          divider={false}
          control={<Switch checked={settings.notify} onCheckedChange={() => toggle('notify')} />}
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
        <div className="flex gap-3 px-[22px] py-[17px]">
          <Button variant="outline" className="h-auto flex-1 rounded-[11px] py-[13px] text-[13.5px]">
            Reboot kit
          </Button>
          <Button
            variant="destructive"
            className="h-auto flex-1 rounded-[11px] py-[13px] text-[13.5px]"
          >
            Stow dish
          </Button>
        </div>
      </Section>
    </div>
  )
}
