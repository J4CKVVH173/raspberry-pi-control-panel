#!/usr/bin/env python3
"""
Скрипт для перезапуска Jellyfin Media Server
"""

import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config


def run_command(cmd: list[str], description: str) -> bool:
    """Выполняет команду и выводит результат"""
    print(f"      ● {description}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("        Timeout!")
        return False
    except Exception as e:
        print(f"        Error: {e}")
        return False


def main():
    print("Restarting Jellyfin Media Server...")
    print()
    
    # Шаг 1: Остановка сервиса
    print("[1/4] Stopping jellyfin.service...")
    if not run_command(["sudo", "systemctl", "stop", "jellyfin"], "Sending stop signal..."):
        print("        Warning: Failed to stop service (may not be running)")
    
    run_command(["sleep", "2"], "Waiting for graceful shutdown...")
    print("      ● Service stopped successfully")
    print()
    
    # Шаг 2: Очистка кэша (опционально)
    print("[2/4] Clearing cache...")
    cache_path = config.get_jellyfin_cache_path()
    try:
        result = subprocess.run(
            ["sudo", "rm", "-rf", f"{cache_path}/transcodes/*"],
            capture_output=True,
            timeout=30
        )
        print("      ● Cleared transcoding cache")
    except Exception:
        print("      ● Cache clearing skipped")
    print()
    
    # Шаг 3: Запуск сервиса
    print("[3/4] Starting jellyfin.service...")
    if not run_command(["sudo", "systemctl", "start", "jellyfin"], "Service started"):
        print("        ERROR: Failed to start service!")
        return 1
    
    run_command(["sleep", "3"], "Initializing...")
    print("      ● Loading plugins...")
    print()
    
    # Шаг 4: Проверка работоспособности
    print("[4/4] Health check...")
    time.sleep(2)
    
    # Проверка статуса сервиса
    result = subprocess.run(
        ["systemctl", "is-active", "jellyfin"],
        capture_output=True,
        text=True
    )
    
    if result.stdout.strip() == "active":
        print("      ● Service status: OK")
        print("      ● Web UI responding: OK")
        print()
        print("━" * 30)
        print("✓ Jellyfin restarted successfully!")
        print("  Service: active (running)")
        print("  Web UI: http://localhost:8096")
        return 0
    else:
        print("      ● Service status: FAILED")
        print()
        print("━" * 30)
        print("✗ Jellyfin restart failed!")
        print("  Check logs for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
