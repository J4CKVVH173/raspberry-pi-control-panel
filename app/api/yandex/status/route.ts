import { NextResponse } from 'next/server'

// Симуляция получения статуса VPS
export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 800))

  const statuses = ['RUNNING', 'STOPPED', 'STARTING']
  const status = statuses[Math.floor(Math.random() * statuses.length)]

  const output = `Checking Yandex Cloud VM status...
Instance ID: fhm1234abcd5678efgh
Folder ID: b1g9d2k23mfc1234abcd

Current status: ${status}
${status === 'RUNNING' ? 'External IP: 51.250.xx.xxx\nUptime: 3d 14h 22m' : ''}
${status === 'STOPPED' ? 'Instance is not running.\nLast stopped: 2024-01-15 14:30:00' : ''}
${status === 'STARTING' ? 'Instance is booting up...\nEstimated time: ~30 seconds' : ''}

Zone: ru-central1-a
Platform: standard-v3
Cores: 2 | RAM: 4GB | Disk: 50GB`

  return NextResponse.json({
    success: true,
    output,
    status,
    timestamp: new Date().toISOString(),
  })
}
