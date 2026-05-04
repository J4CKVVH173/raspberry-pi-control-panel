import { NextResponse } from 'next/server'

// Симуляция запуска VPS (в реальности вызывает Python скрипт)
export async function POST() {
  // Симулируем задержку выполнения скрипта
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Симулируем успешный ответ
  const output = `Starting Yandex Cloud VM...
Connecting to cloud.yandex.ru...
Instance ID: fhm1234abcd5678efgh
Current status: STOPPED

Starting instance...
Waiting for instance to become RUNNING...

Instance started successfully!
Current status: RUNNING
External IP: 51.250.xx.xxx

Instance is now accessible via SSH.`

  return NextResponse.json({
    success: true,
    output,
    timestamp: new Date().toISOString(),
  })
}
