'use client'

import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Thermometer, 
  Clock, 
  Wifi, 
  RefreshCw,
  Zap,
  Activity,
  Server,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SystemStats, DiskInfo } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Форматирует байты в читаемый формат
 * Автоматически выбирает подходящую единицу измерения
 */
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}

/**
 * Форматирует скорость передачи данных
 * @param bytesPerSec - байт в секунду
 */
function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`
}

/**
 * Определяет цвет прогресс-бара в зависимости от процента использования
 */
function getUsageColor(percent: number, thresholds = { warning: 70, critical: 90 }): string {
  if (percent >= thresholds.critical) return '[&>div]:bg-destructive'
  if (percent >= thresholds.warning) return '[&>div]:bg-warning'
  return '[&>div]:bg-primary'
}

/**
 * Определяет цвет температуры
 */
function getTempColor(temp: number): string {
  if (temp >= 80) return 'text-destructive'
  if (temp >= 65) return 'text-warning'
  return 'text-success'
}

function StatItem({
  icon: Icon,
  label,
  value,
  subValue,
  progress,
  progressColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  subValue?: string
  progress?: number
  progressColor?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm font-medium text-foreground">{value}</span>
          {subValue && (
            <span className="ml-1 text-xs text-muted-foreground">{subValue}</span>
          )}
        </div>
      </div>
      {progress !== undefined && (
        <Progress
          value={Math.min(progress, 100)}
          className={cn('h-2', progressColor)}
        />
      )}
    </div>
  )
}

/**
 * Компонент отображения информации о диске
 * Поддерживает динамическое отображение любого количества дисков
 */
function DiskCard({ disk, index }: { disk: DiskInfo; index: number }) {
  const usageColor = getUsageColor(disk.usagePercent)
  
  // Определяем цвет иконки в зависимости от индекса для визуального разделения
  const iconColors = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5']
  const iconColor = iconColors[index % iconColors.length]

  return (
    <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
      {/* Заголовок диска */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className={cn('h-4 w-4', iconColor)} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {disk.label || disk.device}
            </span>
            <span className="text-xs text-muted-foreground">
              {disk.mountPoint}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {disk.isHealthy ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          )}
          {disk.fsType && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
              {disk.fsType}
            </span>
          )}
        </div>
      </div>

      {/* Прогресс-бар использования */}
      <Progress
        value={disk.usagePercent}
        className={cn('h-2', usageColor)}
      />

      {/* Статистика использования */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Использовано: <span className="font-mono text-foreground">{formatBytes(disk.usedBytes)}</span>
        </span>
        <span className="font-mono font-medium text-foreground">
          {disk.usagePercent.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Свободно: <span className="font-mono text-foreground">{formatBytes(disk.freeBytes)}</span>
        </span>
        <span>
          Всего: <span className="font-mono text-foreground">{formatBytes(disk.totalBytes)}</span>
        </span>
      </div>
    </div>
  )
}

export function SystemStatsCard() {
  const prevDataRef = useRef<SystemStats | null>(null)
  
  const { data, error, isLoading, mutate } = useSWR<SystemStats>(
    '/api/system/status',
    fetcher,
    {
      refreshInterval: 5000, // Обновление каждые 5 секунд
      revalidateOnFocus: true,
    }
  )

  // Сохраняем предыдущие данные для расчёта изменений
  useEffect(() => {
    if (data) {
      prevDataRef.current = data
    }
  }, [data])

  // Автоматическое обновление при монтировании
  useEffect(() => {
    mutate()
  }, [mutate])

  const cpuUsageColor = getUsageColor(data?.cpuUsage ?? 0, { warning: 70, critical: 85 })
  const ramUsagePercent = data ? (data.ramUsed / data.ramTotal) * 100 : 0
  const ramUsageColor = getUsageColor(ramUsagePercent, { warning: 75, critical: 90 })
  const tempColor = getTempColor(data?.cpuTemp ?? 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Статус системы</CardTitle>
              <CardDescription>
                {data?.hostname && (
                  <span className="font-mono">{data.hostname}</span>
                )}
                {data?.hostname && ' — '}
                Мониторинг Raspberry Pi
              </CardDescription>
            </div>
          </div>
          <button
            onClick={() => mutate()}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Обновить"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
            Ошибка загрузки данных системы
          </div>
        ) : isLoading && !data ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary/50" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Секция: Процессор */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Cpu className="h-4 w-4" />
                Процессор
              </h3>
              
              {/* Температура и напряжение */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-2">
                    <Thermometer className={cn('h-4 w-4', tempColor)} />
                    <span className="text-xs text-muted-foreground">Температура</span>
                  </div>
                  <span className={cn('font-mono text-sm font-bold', tempColor)}>
                    {data.cpuTemp.toFixed(1)}°C
                  </span>
                </div>
                
                {data.cpuVoltage !== undefined && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-warning" />
                      <span className="text-xs text-muted-foreground">Напряжение</span>
                    </div>
                    <span className="font-mono text-sm font-medium text-foreground">
                      {data.cpuVoltage.toFixed(2)}V
                    </span>
                  </div>
                )}
              </div>

              {/* Загрузка CPU */}
              <StatItem
                icon={Activity}
                label="Загрузка CPU"
                value={`${data.cpuUsage.toFixed(1)}%`}
                subValue={data.cpuFrequency ? `@ ${data.cpuFrequency} MHz` : undefined}
                progress={data.cpuUsage}
                progressColor={cpuUsageColor}
              />
            </div>

            {/* Секция: Память */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MemoryStick className="h-4 w-4" />
                Память
              </h3>
              
              {/* RAM */}
              <StatItem
                icon={MemoryStick}
                label="RAM"
                value={formatBytes(data.ramUsed)}
                subValue={`/ ${formatBytes(data.ramTotal)}`}
                progress={ramUsagePercent}
                progressColor={ramUsageColor}
              />

              {/* Swap (если есть) */}
              {data.swapTotal !== undefined && data.swapTotal > 0 && (
                <StatItem
                  icon={MemoryStick}
                  label="Swap"
                  value={formatBytes(data.swapUsed ?? 0)}
                  subValue={`/ ${formatBytes(data.swapTotal)}`}
                  progress={((data.swapUsed ?? 0) / data.swapTotal) * 100}
                  progressColor="[&>div]:bg-chart-4"
                />
              )}
            </div>

            {/* Секция: Диски (динамический список) */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                Диски ({data.disks.length})
              </h3>
              
              <div className="space-y-2">
                {data.disks.map((disk, index) => (
                  <DiskCard key={disk.device} disk={disk} index={index} />
                ))}
              </div>

              {data.disks.length === 0 && (
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center text-sm text-muted-foreground">
                  Нет данных о дисках
                </div>
              )}
            </div>

            {/* Секция: Сеть */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wifi className="h-4 w-4" />
                Сеть
              </h3>
              
              {/* Скорость передачи данных */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Загрузка</span>
                    <span className="font-mono text-sm font-medium text-success">
                      ↓ {formatSpeed(data.network.rxBytesPerSec)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Всего: <span className="font-mono">{formatBytes(data.network.rxTotalBytes)}</span>
                  </div>
                </div>
                
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Отдача</span>
                    <span className="font-mono text-sm font-medium text-chart-2">
                      ↑ {formatSpeed(data.network.txBytesPerSec)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Всего: <span className="font-mono">{formatBytes(data.network.txTotalBytes)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Секция: Система */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Server className="h-4 w-4" />
                Система
              </h3>
              
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Uptime</span>
                  </div>
                  <span className="font-mono text-foreground">{data.uptime}</span>
                </div>
                
                {data.kernelVersion && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ядро</span>
                    <span className="font-mono text-xs text-foreground">{data.kernelVersion}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
