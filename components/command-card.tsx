'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Play, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommandConfig, CommandResult, CommandStatus } from '@/lib/types'

interface CommandCardProps {
  title: string
  description: string
  icon: React.ReactNode
  commands: CommandConfig[]
}

function StatusBadge({ status }: { status: CommandStatus }) {
  const config = {
    idle: { icon: Clock, label: 'Ожидание', className: 'text-muted-foreground' },
    running: { icon: Loader2, label: 'Выполнение...', className: 'text-warning animate-pulse' },
    success: { icon: CheckCircle2, label: 'Успешно', className: 'text-success' },
    error: { icon: AlertCircle, label: 'Ошибка', className: 'text-destructive' },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', className)}>
      <Icon className={cn('h-4 w-4', status === 'running' && 'animate-spin')} />
      <span>{label}</span>
    </div>
  )
}

export function CommandCard({ title, description, icon, commands }: CommandCardProps) {
  const [results, setResults] = useState<Record<string, CommandResult>>({})
  const [activeCommand, setActiveCommand] = useState<string | null>(null)

  const executeCommand = useCallback(async (command: CommandConfig) => {
    // Блокируем повторный запуск, если команда уже выполняется
    if (activeCommand === command.id) return

    setActiveCommand(command.id)
    setResults((prev) => ({
      ...prev,
      [command.id]: {
        status: 'running',
        output: '',
        timestamp: new Date().toLocaleTimeString('ru-RU'),
      },
    }))

    try {
      const response = await fetch(command.endpoint, {
        method: command.method,
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      setResults((prev) => ({
        ...prev,
        [command.id]: {
          status: response.ok ? 'success' : 'error',
          output: data.output || data.message || JSON.stringify(data, null, 2),
          timestamp: new Date().toLocaleTimeString('ru-RU'),
          error: data.error,
        },
      }))
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [command.id]: {
          status: 'error',
          output: '',
          timestamp: new Date().toLocaleTimeString('ru-RU'),
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        },
      }))
    } finally {
      setActiveCommand(null)
    }
  }, [activeCommand])

  // Находим последний результат для отображения в логах
  const latestResult = Object.entries(results)
    .filter(([, r]) => r.output || r.error)
    .sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp))[0]

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Кнопки команд */}
        <div className="flex flex-wrap gap-2">
          {commands.map((cmd) => {
            const result = results[cmd.id]
            const isRunning = activeCommand === cmd.id

            return (
              <div key={cmd.id} className="flex flex-col gap-1">
                <Button
                  variant={cmd.dangerous ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={() => executeCommand(cmd)}
                  disabled={isRunning}
                  className="gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {cmd.name}
                </Button>
                {result && <StatusBadge status={result.status} />}
              </div>
            )
          })}
        </div>

        {/* Область вывода логов */}
        {latestResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Последний вывод</span>
              <span>{latestResult[1].timestamp}</span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/50 p-3">
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-foreground">
                {latestResult[1].error ? (
                  <span className="text-destructive">{latestResult[1].error}</span>
                ) : (
                  latestResult[1].output
                )}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
