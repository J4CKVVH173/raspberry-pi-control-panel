import { CommandCard } from '@/components/command-card'
import { SystemStatsCard } from '@/components/system-stats'
import { YANDEX_COMMANDS, JELLYFIN_COMMANDS } from '@/lib/types'
import { Cloud, Film, Server } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Raspberry Pi</h1>
              <p className="text-sm text-muted-foreground">Панель управления</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-2 animate-pulse rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Раздел 1: Управление Яндекс Облаком */}
          <CommandCard
            title="Яндекс Облако"
            description="Управление виртуальной машиной"
            icon={<Cloud className="h-5 w-5" />}
            commands={YANDEX_COMMANDS}
          />

          {/* Раздел 2: Управление Jellyfin */}
          <CommandCard
            title="Jellyfin"
            description="Медиа-сервер"
            icon={<Film className="h-5 w-5" />}
            commands={JELLYFIN_COMMANDS}
          />

          {/* Раздел 3: Статус системы - на всю ширину на больших экранах */}
          <div className="lg:col-span-2">
            <SystemStatsCard />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>Локальная панель управления для домашней сети</p>
          <p className="mt-1 text-xs">
            API: <code className="rounded bg-secondary px-1.5 py-0.5 font-mono">http://raspberry-pi:8000</code>
          </p>
        </footer>
      </main>
    </div>
  )
}
