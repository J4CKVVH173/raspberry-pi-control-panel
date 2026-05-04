#!/usr/bin/env python3
"""
Скрипт для проверки статуса Jellyfin Media Server
"""

import subprocess
import sys


def get_service_status():
    """Получает статус systemd сервиса jellyfin"""
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "jellyfin"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip() == "active"
    except Exception:
        return False


def get_service_info():
    """Получает подробную информацию о сервисе"""
    try:
        result = subprocess.run(
            ["systemctl", "show", "jellyfin", "--property=MainPID,MemoryCurrent"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        info = {}
        for line in result.stdout.strip().split("\n"):
            if "=" in line:
                key, value = line.split("=", 1)
                info[key] = value
        
        return info
    except Exception:
        return {}


def main():
    print("Jellyfin Media Server Status")
    print("━" * 30)
    
    is_running = get_service_status()
    info = get_service_info()
    
    print(f"Service: jellyfin.service")
    
    if is_running:
        print(f"Status: ● active (running)")
        
        pid = info.get("MainPID", "N/A")
        memory = info.get("MemoryCurrent", "0")
        
        # Конвертируем память в MB
        try:
            memory_mb = int(memory) / (1024 * 1024)
            memory_str = f"{memory_mb:.0f}MB"
        except (ValueError, TypeError):
            memory_str = "N/A"
        
        print(f"PID: {pid}")
        print(f"Memory: {memory_str}")
        print()
        print("Web UI: http://localhost:8096")
        print("API: http://localhost:8096/api")
    else:
        print(f"Status: ○ inactive (dead)")
        print()
        print("Service is not running.")
        print('Run "Перезапуск" to start the service.')
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
