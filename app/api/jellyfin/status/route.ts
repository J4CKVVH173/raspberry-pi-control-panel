import { NextResponse } from 'next/server'

// Симуляция проверки статуса Jellyfin
export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const isRunning = Math.random() > 0.2 // 80% вероятность, что работает

  const output = isRunning
    ? `Jellyfin Media Server Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service: jellyfin.service
Status: ● active (running)
PID: 1234
Memory: 512MB
CPU: 2.3%

Web UI: http://localhost:8096
API: http://localhost:8096/api

Libraries:
  • Movies: 142 items
  • TV Shows: 38 series
  • Music: 1,247 tracks

Active Sessions: 2
Transcoding: None`
    : `Jellyfin Media Server Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service: jellyfin.service
Status: ○ inactive (dead)

Service is not running.
Last exit: 2024-01-15 10:30:22
Exit code: 0 (clean shutdown)

Run "Перезапуск" to start the service.`

  return NextResponse.json({
    success: true,
    output,
    isRunning,
    timestamp: new Date().toISOString(),
  })
}
