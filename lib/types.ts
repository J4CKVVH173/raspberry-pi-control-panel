// Типы для панели управления Raspberry Pi

export type CommandStatus = 'idle' | 'running' | 'success' | 'error'

export interface CommandResult {
  status: CommandStatus
  output: string
  timestamp: string
  error?: string
}

export interface CommandConfig {
  id: string
  name: string
  description: string
  endpoint: string
  method: 'GET' | 'POST'
  dangerous?: boolean
}

// Информация об отдельном диске
export interface DiskInfo {
  device: string        // Устройство, например "/dev/sda1"
  mountPoint: string    // Точка монтирования, например "/mnt/SSD4TB"
  label?: string        // Пользовательская метка диска
  totalBytes: number    // Общий объём в байтах
  usedBytes: number     // Использовано в байтах
  freeBytes: number     // Свободно в байтах
  usagePercent: number  // Процент использования
  fsType?: string       // Тип файловой системы (ext4, ntfs, etc.)
  isHealthy: boolean    // Доступен ли диск для чтения
}

// Скорость сети (байт/сек за последний интервал)
export interface NetworkSpeed {
  rxBytesPerSec: number  // Скорость загрузки
  txBytesPerSec: number  // Скорость отдачи
  rxTotalBytes: number   // Всего загружено с момента старта
  txTotalBytes: number   // Всего отдано с момента старта
}

export interface SystemStats {
  // Процессор
  cpuTemp: number           // Температура в °C
  cpuVoltage?: number       // Напряжение в V
  cpuUsage: number          // Загрузка в %
  cpuFrequency?: number     // Текущая частота в MHz
  
  // Память
  ramUsed: number           // Использовано в байтах
  ramTotal: number          // Всего в байтах
  swapUsed?: number         // Swap использовано
  swapTotal?: number        // Swap всего
  
  // Диски (динамический массив)
  disks: DiskInfo[]
  
  // Сеть
  network: NetworkSpeed
  
  // Система
  uptime: string            // Форматированное время работы
  uptimeSeconds: number     // Время работы в секундах
  hostname?: string         // Имя хоста
  kernelVersion?: string    // Версия ядра
  
  // Timestamp для расчёта скорости
  timestamp: number         // Unix timestamp в ms
}

// Конфигурация команд для каждого раздела
export const YANDEX_COMMANDS: CommandConfig[] = [
  {
    id: 'start-vps',
    name: 'Запуск VPS',
    description: 'Запускает виртуальную машину в Яндекс Облаке',
    endpoint: '/api/yandex/start-vps',
    method: 'POST',
  },
  {
    id: 'status',
    name: 'Статус ВМ',
    description: 'Проверяет состояние виртуальной машины',
    endpoint: '/api/yandex/status',
    method: 'POST',
  },
]

export const JELLYFIN_COMMANDS: CommandConfig[] = [
  {
    id: 'status',
    name: 'Статус Jellyfin',
    description: 'Проверяет статус сервиса Jellyfin',
    endpoint: '/api/jellyfin/status',
    method: 'POST',
  },
  {
    id: 'logs',
    name: 'Логи Jellyfin',
    description: 'Получает последние логи Jellyfin',
    endpoint: '/api/jellyfin/logs',
    method: 'POST',
  },
  {
    id: 'restart',
    name: 'Перезапуск',
    description: 'Перезапускает сервис Jellyfin',
    endpoint: '/api/jellyfin/restart',
    method: 'POST',
    dangerous: true,
  },
]
