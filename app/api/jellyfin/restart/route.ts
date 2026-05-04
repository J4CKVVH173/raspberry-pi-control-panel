import { NextResponse } from 'next/server'

// Симуляция перезапуска Jellyfin
export async function POST() {
  // Более длительная задержка для перезапуска
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const output = `Restarting Jellyfin Media Server...

[1/4] Stopping jellyfin.service...
      ● Sending SIGTERM to PID 1234
      ● Waiting for graceful shutdown...
      ● Service stopped successfully

[2/4] Clearing cache...
      ● Removed 156 cached items
      ● Cache cleared: 234MB freed

[3/4] Starting jellyfin.service...
      ● Service started with PID 5678
      ● Initializing database...
      ● Loading plugins...

[4/4] Health check...
      ● Web UI responding: OK
      ● API responding: OK
      ● Database connection: OK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Jellyfin restarted successfully!
  Service: active (running)
  Web UI: http://localhost:8096
  Startup time: 4.2 seconds`

  return NextResponse.json({
    success: true,
    output,
    timestamp: new Date().toISOString(),
  })
}
