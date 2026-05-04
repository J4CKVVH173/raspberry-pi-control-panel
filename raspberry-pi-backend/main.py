"""
Raspberry Pi Dashboard Backend
FastAPI сервер для управления скриптами через веб-интерфейс

Запуск: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import re
import subprocess
import asyncio
import time
from datetime import datetime
from typing import Optional
from pathlib import Path

import psutil
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Конфигурация путей к скриптам
# Измените эти пути на реальные пути к вашим скриптам
SCRIPTS_CONFIG = {
    "yandex": {
        "start_vps": "/home/pi/scripts/yandex/start_vps.py",
        "status": "/home/pi/scripts/yandex/check_status.py",
    },
    "jellyfin": {
        "status": "/home/pi/scripts/jellyfin/check_status.py",
        "logs": "/home/pi/scripts/jellyfin/get_logs.py",
        "restart": "/home/pi/scripts/jellyfin/restart.py",
    },
}

# Конфигурация дисков для мониторинга
# Добавляйте новые диски сюда - они автоматически появятся в интерфейсе
DISK_CONFIG = {
    # Разрешённые точки монтирования
    "allowed_mount_points": {"/", "/boot/firmware", "/mnt/SSD4TB/D"},
    # Регулярное выражение для устройств
    "allowed_devices_pattern": r"mmcblk0p[12]|sd[a-z]+\d+",
    # Пользовательские метки для дисков
    "labels": {
        "/": "Системный диск",
        "/boot/firmware": "Boot раздел",
        "/mnt/SSD4TB/D": "SSD 4TB Данные",
    },
}

# Список разрешённых команд для безопасности
ALLOWED_COMMANDS = set()
for category in SCRIPTS_CONFIG.values():
    for script_path in category.values():
        ALLOWED_COMMANDS.add(script_path)

app = FastAPI(
    title="Raspberry Pi Dashboard API",
    description="API для управления скриптами на Raspberry Pi",
    version="1.0.0",
)

# Настройка CORS для локальной сети
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене ограничьте до конкретных IP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Модели данных ====================

class CommandResponse(BaseModel):
    """Модель ответа выполнения команды"""
    success: bool
    output: str
    error: Optional[str] = None
    timestamp: str
    execution_time: float


class DiskInfo(BaseModel):
    """Информация об отдельном диске"""
    device: str           # Устройство, например "/dev/sda1"
    mountPoint: str       # Точка монтирования
    label: Optional[str]  # Пользовательская метка
    totalBytes: int       # Общий объём в байтах
    usedBytes: int        # Использовано в байтах
    freeBytes: int        # Свободно в байтах
    usagePercent: float   # Процент использования
    fsType: Optional[str] # Тип файловой системы
    isHealthy: bool       # Доступен ли диск для чтения


class NetworkSpeed(BaseModel):
    """Скорость сети"""
    rxBytesPerSec: float   # Скорость загрузки (байт/сек)
    txBytesPerSec: float   # Скорость отдачи (байт/сек)
    rxTotalBytes: int      # Всего загружено
    txTotalBytes: int      # Всего отдано


class SystemStats(BaseModel):
    """Полный статус системы"""
    # Процессор
    cpuTemp: float
    cpuVoltage: Optional[float]
    cpuUsage: float
    cpuFrequency: Optional[int]
    
    # Память
    ramUsed: int
    ramTotal: int
    swapUsed: Optional[int]
    swapTotal: Optional[int]
    
    # Диски (динамический список)
    disks: list[DiskInfo]
    
    # Сеть
    network: NetworkSpeed
    
    # Система
    uptime: str
    uptimeSeconds: int
    hostname: Optional[str]
    kernelVersion: Optional[str]
    
    # Timestamp
    timestamp: int


# ==================== Глобальные переменные для расчёта скорости ====================

_prev_network_rx = 0
_prev_network_tx = 0
_prev_timestamp = time.time()


# ==================== Функции получения данных системы ====================

def get_cpu_temperature() -> float:
    """Получение температуры CPU Raspberry Pi через vcgencmd или sysfs"""
    # Метод 1: vcgencmd (предпочтительный для Raspberry Pi)
    try:
        result = subprocess.check_output(["vcgencmd", "measure_temp"]).decode("utf-8")
        # Формат: temp=45.6'C
        temp = float(result.split("=")[1].split("'")[0])
        return round(temp, 1)
    except Exception:
        pass
    
    # Метод 2: sysfs (универсальный)
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = float(f.read().strip()) / 1000
            return round(temp, 1)
    except Exception:
        return 0.0


def get_cpu_voltage() -> Optional[float]:
    """Получение напряжения CPU через vcgencmd"""
    try:
        result = subprocess.check_output(["vcgencmd", "measure_volts"]).decode("utf-8")
        # Формат: volt=1.3500V
        voltage = float(result.split("=")[1].rstrip("V\n"))
        return round(voltage, 4)
    except Exception:
        return None


def get_cpu_frequency() -> Optional[int]:
    """Получение текущей частоты CPU в MHz"""
    try:
        result = subprocess.check_output(["vcgencmd", "measure_clock", "arm"]).decode("utf-8")
        # Формат: frequency(48)=1500000000
        freq_hz = int(result.split("=")[1].strip())
        return freq_hz // 1_000_000  # В MHz
    except Exception:
        pass
    
    try:
        with open("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq", "r") as f:
            freq_khz = int(f.read().strip())
            return freq_khz // 1000  # В MHz
    except Exception:
        return None


def get_cpu_usage() -> float:
    """
    Получение загрузки CPU с использованием psutil
    
    Для точного измерения используется интервал в 0.5 секунды,
    что даёт более стабильные показатели чем мгновенное значение.
    """
    try:
        usage = psutil.cpu_percent(interval=0.5)
        return round(usage, 1)
    except Exception:
        return 0.0


def get_memory_info() -> tuple[int, int, int, int]:
    """
    Получение информации о памяти
    
    Returns:
        (ram_used, ram_total, swap_used, swap_total) в байтах
    """
    try:
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return (
            memory.used,
            memory.total,
            swap.used,
            swap.total,
        )
    except Exception:
        return 0, 0, 0, 0


def get_disk_info() -> list[DiskInfo]:
    """
    Получение информации о дисках
    
    Динамически определяет доступные диски на основе:
    1. Разрешённых точек монтирования
    2. Паттерна имён устройств
    
    Для добавления нового диска:
    - Добавьте точку монтирования в DISK_CONFIG["allowed_mount_points"]
    - Опционально добавьте метку в DISK_CONFIG["labels"]
    """
    disks = []
    allowed_pattern = re.compile(DISK_CONFIG["allowed_devices_pattern"])
    
    try:
        partitions = psutil.disk_partitions()
        
        for partition in partitions:
            device_name = partition.device.split("/")[-1]
            
            # Проверяем, разрешён ли этот диск
            is_allowed = (
                partition.mountpoint in DISK_CONFIG["allowed_mount_points"]
                or allowed_pattern.match(device_name)
            )
            
            if not is_allowed:
                continue
            
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                
                # Проверяем доступность диска
                is_healthy = True
                try:
                    os.listdir(partition.mountpoint)
                except OSError:
                    is_healthy = False
                
                disk = DiskInfo(
                    device=partition.device,
                    mountPoint=partition.mountpoint,
                    label=DISK_CONFIG["labels"].get(partition.mountpoint),
                    totalBytes=usage.total,
                    usedBytes=usage.used,
                    freeBytes=usage.free,
                    usagePercent=round(usage.percent, 1),
                    fsType=partition.fstype,
                    isHealthy=is_healthy,
                )
                disks.append(disk)
                
            except PermissionError:
                # Диск недоступен, но добавляем с флагом isHealthy=False
                disk = DiskInfo(
                    device=partition.device,
                    mountPoint=partition.mountpoint,
                    label=DISK_CONFIG["labels"].get(partition.mountpoint),
                    totalBytes=0,
                    usedBytes=0,
                    freeBytes=0,
                    usagePercent=0,
                    fsType=partition.fstype,
                    isHealthy=False,
                )
                disks.append(disk)
                
    except Exception:
        pass
    
    return disks


def get_network_stats() -> NetworkSpeed:
    """
    Получение статистики сети с расчётом скорости
    
    Скорость рассчитывается как разница между текущим и предыдущим
    измерением, делённая на время между измерениями.
    
    Для точного измерения скорости API должен вызываться регулярно
    (рекомендуется интервал 5 секунд).
    """
    global _prev_network_rx, _prev_network_tx, _prev_timestamp
    
    try:
        net_io = psutil.net_io_counters()
        current_rx = net_io.bytes_recv
        current_tx = net_io.bytes_sent
        current_time = time.time()
        
        time_delta = current_time - _prev_timestamp
        
        if time_delta > 0 and _prev_timestamp > 0:
            rx_speed = (current_rx - _prev_network_rx) / time_delta
            tx_speed = (current_tx - _prev_network_tx) / time_delta
        else:
            rx_speed = 0
            tx_speed = 0
        
        # Сохраняем для следующего расчёта
        _prev_network_rx = current_rx
        _prev_network_tx = current_tx
        _prev_timestamp = current_time
        
        return NetworkSpeed(
            rxBytesPerSec=round(rx_speed, 2),
            txBytesPerSec=round(tx_speed, 2),
            rxTotalBytes=current_rx,
            txTotalBytes=current_tx,
        )
    except Exception:
        return NetworkSpeed(
            rxBytesPerSec=0,
            txBytesPerSec=0,
            rxTotalBytes=0,
            txTotalBytes=0,
        )


def get_uptime() -> tuple[str, int]:
    """
    Получение uptime системы
    
    Returns:
        (formatted_string, seconds) - форматированная строка и секунды
    """
    try:
        boot_time = psutil.boot_time()
        uptime_seconds = int(time.time() - boot_time)
        
        days = uptime_seconds // (24 * 3600)
        hours = (uptime_seconds % (24 * 3600)) // 3600
        minutes = (uptime_seconds % 3600) // 60
        
        parts = []
        if days > 0:
            parts.append(f"{days}d")
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        
        return " ".join(parts) or "0m", uptime_seconds
    except Exception:
        return "N/A", 0


def get_hostname() -> Optional[str]:
    """Получение имени хоста"""
    try:
        import socket
        return socket.gethostname()
    except Exception:
        return None


def get_kernel_version() -> Optional[str]:
    """Получение версии ядра Linux"""
    try:
        result = subprocess.check_output(["uname", "-r"]).decode("utf-8").strip()
        return result
    except Exception:
        return None


# ==================== Выполнение скриптов ====================

async def execute_script(script_path: str, timeout: int = 60) -> CommandResponse:
    """
    Безопасное выполнение Python скрипта с таймаутом
    
    Args:
        script_path: Полный путь к скрипту
        timeout: Максимальное время выполнения в секундах
    
    Returns:
        CommandResponse с результатом выполнения
    """
    start_time = datetime.now()
    
    # Проверка безопасности: только разрешённые скрипты
    if script_path not in ALLOWED_COMMANDS:
        raise HTTPException(
            status_code=403,
            detail=f"Скрипт не разрешён для выполнения: {script_path}"
        )
    
    # Проверка существования файла
    if not Path(script_path).exists():
        return CommandResponse(
            success=False,
            output="",
            error=f"Скрипт не найден: {script_path}",
            timestamp=datetime.now().isoformat(),
            execution_time=0
        )
    
    try:
        # Асинхронное выполнение скрипта
        process = await asyncio.create_subprocess_exec(
            "python3", script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=timeout
        )
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        if process.returncode == 0:
            return CommandResponse(
                success=True,
                output=stdout.decode("utf-8"),
                timestamp=datetime.now().isoformat(),
                execution_time=execution_time
            )
        else:
            return CommandResponse(
                success=False,
                output=stdout.decode("utf-8"),
                error=stderr.decode("utf-8"),
                timestamp=datetime.now().isoformat(),
                execution_time=execution_time
            )
            
    except asyncio.TimeoutError:
        process.kill()
        return CommandResponse(
            success=False,
            output="",
            error=f"Превышено время ожидания ({timeout}с)",
            timestamp=datetime.now().isoformat(),
            execution_time=timeout
        )
    except Exception as e:
        return CommandResponse(
            success=False,
            output="",
            error=str(e),
            timestamp=datetime.now().isoformat(),
            execution_time=(datetime.now() - start_time).total_seconds()
        )


# ==================== API эндпоинты: Яндекс Облако ====================

@app.post("/api/yandex/start-vps", response_model=CommandResponse)
async def yandex_start_vps():
    """Запуск VPS в Яндекс Облаке"""
    return await execute_script(SCRIPTS_CONFIG["yandex"]["start_vps"])


@app.post("/api/yandex/status", response_model=CommandResponse)
async def yandex_status():
    """Получение статуса VPS в Яндекс Облаке"""
    return await execute_script(SCRIPTS_CONFIG["yandex"]["status"])


# ==================== API эндпоинты: Jellyfin ====================

@app.post("/api/jellyfin/status", response_model=CommandResponse)
async def jellyfin_status():
    """Проверка статуса Jellyfin"""
    return await execute_script(SCRIPTS_CONFIG["jellyfin"]["status"])


@app.post("/api/jellyfin/logs", response_model=CommandResponse)
async def jellyfin_logs():
    """Получение логов Jellyfin"""
    return await execute_script(SCRIPTS_CONFIG["jellyfin"]["logs"])


@app.post("/api/jellyfin/restart", response_model=CommandResponse)
async def jellyfin_restart():
    """Перезапуск Jellyfin"""
    return await execute_script(SCRIPTS_CONFIG["jellyfin"]["restart"], timeout=120)


# ==================== API эндпоинты: Статус системы ====================

@app.get("/api/system/status", response_model=SystemStats)
async def system_status():
    """
    Получение полного статуса системы Raspberry Pi
    
    Включает:
    - Температуру, напряжение и частоту CPU
    - Загрузку CPU и RAM
    - Информацию о всех разрешённых дисках
    - Скорость сети (требует регулярного опроса для точности)
    - Uptime и системную информацию
    """
    ram_used, ram_total, swap_used, swap_total = get_memory_info()
    uptime_str, uptime_seconds = get_uptime()
    
    return SystemStats(
        # Процессор
        cpuTemp=get_cpu_temperature(),
        cpuVoltage=get_cpu_voltage(),
        cpuUsage=get_cpu_usage(),
        cpuFrequency=get_cpu_frequency(),
        
        # Память
        ramUsed=ram_used,
        ramTotal=ram_total,
        swapUsed=swap_used,
        swapTotal=swap_total,
        
        # Диски
        disks=get_disk_info(),
        
        # Сеть
        network=get_network_stats(),
        
        # Система
        uptime=uptime_str,
        uptimeSeconds=uptime_seconds,
        hostname=get_hostname(),
        kernelVersion=get_kernel_version(),
        
        timestamp=int(time.time() * 1000),
    )


# ==================== Служебные эндпоинты ====================

@app.get("/api/health")
async def health_check():
    """Проверка работоспособности API"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


@app.get("/api/commands")
async def list_commands():
    """Список доступных команд"""
    return {
        "yandex": list(SCRIPTS_CONFIG["yandex"].keys()),
        "jellyfin": list(SCRIPTS_CONFIG["jellyfin"].keys()),
    }


@app.get("/api/disks/config")
async def get_disk_config():
    """Получение текущей конфигурации дисков"""
    return {
        "allowed_mount_points": list(DISK_CONFIG["allowed_mount_points"]),
        "allowed_devices_pattern": DISK_CONFIG["allowed_devices_pattern"],
        "labels": DISK_CONFIG["labels"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
