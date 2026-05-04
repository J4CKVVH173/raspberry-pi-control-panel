import { NextResponse } from 'next/server'
import type { SystemStats, DiskInfo } from '@/lib/types'

// Симуляция получения статуса системы Raspberry Pi
// В реальном бэкенде эти данные приходят от Python API

// Хранение предыдущих значений для расчёта скорости сети
let prevNetworkRx = 0
let prevNetworkTx = 0
let prevTimestamp = Date.now()

export async function GET() {
  const now = Date.now()
  const timeDelta = (now - prevTimestamp) / 1000 // в секундах

  // Генерируем реалистичные данные с небольшими колебаниями
  const baseTemp = 45
  const baseCpu = 15
  const baseRamUsed = 1.2 * 1024 * 1024 * 1024 // 1.2 GB

  // Симуляция динамического списка дисков
  const disks: DiskInfo[] = [
    {
      device: '/dev/mmcblk0p2',
      mountPoint: '/',
      label: 'Системный диск',
      totalBytes: 64 * 1024 * 1024 * 1024, // 64 GB
      usedBytes: 28.5 * 1024 * 1024 * 1024 + Math.random() * 0.5 * 1024 * 1024 * 1024,
      freeBytes: 35.5 * 1024 * 1024 * 1024,
      usagePercent: 44.5 + Math.random() * 2,
      fsType: 'ext4',
      isHealthy: true,
    },
    {
      device: '/dev/mmcblk0p1',
      mountPoint: '/boot/firmware',
      label: 'Boot раздел',
      totalBytes: 512 * 1024 * 1024, // 512 MB
      usedBytes: 156 * 1024 * 1024,
      freeBytes: 356 * 1024 * 1024,
      usagePercent: 30.5,
      fsType: 'vfat',
      isHealthy: true,
    },
    {
      device: '/dev/sda1',
      mountPoint: '/mnt/SSD4TB/D',
      label: 'SSD 4TB Данные',
      totalBytes: 4 * 1024 * 1024 * 1024 * 1024, // 4 TB
      usedBytes: 2.8 * 1024 * 1024 * 1024 * 1024 + Math.random() * 10 * 1024 * 1024 * 1024,
      freeBytes: 1.2 * 1024 * 1024 * 1024 * 1024,
      usagePercent: 70 + Math.random() * 2,
      fsType: 'ntfs',
      isHealthy: Math.random() > 0.05, // 95% времени доступен
    },
  ]

  // Пересчитываем freeBytes и usagePercent для точности
  disks.forEach(disk => {
    disk.freeBytes = disk.totalBytes - disk.usedBytes
    disk.usagePercent = (disk.usedBytes / disk.totalBytes) * 100
  })

  // Симуляция скорости сети
  const currentRx = prevNetworkRx + Math.floor(Math.random() * 5) * 1024 * 1024 // +0-5 MB
  const currentTx = prevNetworkTx + Math.floor(Math.random() * 2) * 1024 * 1024 // +0-2 MB
  
  const rxSpeed = timeDelta > 0 ? (currentRx - prevNetworkRx) / timeDelta : 0
  const txSpeed = timeDelta > 0 ? (currentTx - prevNetworkTx) / timeDelta : 0

  prevNetworkRx = currentRx
  prevNetworkTx = currentTx
  prevTimestamp = now

  const uptimeSeconds = randomUptime()

  const stats: SystemStats = {
    // Процессор
    cpuTemp: baseTemp + Math.random() * 15, // 45-60°C
    cpuVoltage: 1.35 - Math.random() * 0.05, // ~1.30-1.35V
    cpuUsage: baseCpu + Math.random() * 30, // 15-45%
    cpuFrequency: 1500 + Math.floor(Math.random() * 300), // 1500-1800 MHz
    
    // Память
    ramUsed: baseRamUsed + Math.random() * 0.5 * 1024 * 1024 * 1024, // 1.2-1.7 GB
    ramTotal: 4 * 1024 * 1024 * 1024, // 4 GB
    swapUsed: Math.random() * 100 * 1024 * 1024, // 0-100 MB
    swapTotal: 2 * 1024 * 1024 * 1024, // 2 GB
    
    // Диски
    disks,
    
    // Сеть
    network: {
      rxBytesPerSec: rxSpeed,
      txBytesPerSec: txSpeed,
      rxTotalBytes: currentRx,
      txTotalBytes: currentTx,
    },
    
    // Система
    uptime: formatUptime(uptimeSeconds),
    uptimeSeconds,
    hostname: 'raspberrypi',
    kernelVersion: '6.6.31+rpt-rpi-v8',
    
    timestamp: now,
  }

  return NextResponse.json(stats)
}

function randomUptime(): number {
  // Случайный uptime от 1 часа до 30 дней в секундах
  return Math.floor(Math.random() * 30 * 24 * 60 * 60) + 3600
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60))
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((seconds % (60 * 60)) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(' ') || '0m'
}
