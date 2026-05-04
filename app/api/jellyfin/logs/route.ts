import { NextResponse } from 'next/server'

// Симуляция получения логов Jellyfin
export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 600))

  const output = `=== Jellyfin Logs (last 20 lines) ===

[2024-01-15 14:30:01] [INF] Jellyfin version 10.8.13
[2024-01-15 14:30:01] [INF] Arguments: /usr/lib/jellyfin/bin/jellyfin.dll
[2024-01-15 14:30:02] [INF] Operating system: Debian GNU/Linux 11
[2024-01-15 14:30:02] [INF] Architecture: Arm64
[2024-01-15 14:30:03] [INF] Loaded plugin: TMDb 16.0.0.0
[2024-01-15 14:30:03] [INF] Loaded plugin: Open Subtitles 22.0.0.0
[2024-01-15 14:30:04] [INF] SQLite version: 3.40.1
[2024-01-15 14:30:04] [INF] Database initialized
[2024-01-15 14:30:05] [INF] Starting HTTP server on 0.0.0.0:8096
[2024-01-15 14:30:05] [INF] Web socket server started
[2024-01-15 14:32:10] [INF] User "admin" authenticated from 192.168.1.50
[2024-01-15 14:35:22] [INF] Library scan started: Movies
[2024-01-15 14:35:45] [INF] Library scan completed: 142 items found
[2024-01-15 14:40:00] [INF] Scheduled task "Refresh Guide" completed
[2024-01-15 15:00:00] [INF] Scheduled task "Download missing subtitles" started
[2024-01-15 15:02:30] [INF] Downloaded 3 subtitle files
[2024-01-15 15:10:15] [INF] User "user1" started playback: Movie.mkv
[2024-01-15 15:10:16] [INF] Direct stream started, no transcoding required
[2024-01-15 15:45:00] [INF] Playback stopped by user
[2024-01-15 16:00:00] [INF] System health check: OK`

  return NextResponse.json({
    success: true,
    output,
    timestamp: new Date().toISOString(),
  })
}
