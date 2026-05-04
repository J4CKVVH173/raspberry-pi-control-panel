#!/usr/bin/env python3
"""
Скрипт для получения логов Jellyfin Media Server
"""

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config


def get_journalctl_logs(lines: int = 30):
    """Получает логи из journalctl"""
    try:
        result = subprocess.run(
            ["journalctl", "-u", "jellyfin", "-n", str(lines), "--no-pager"],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout
    except Exception as e:
        return f"Ошибка получения логов: {e}"


def get_file_logs(lines: int = 30):
    """Получает логи из файла"""
    log_path = config.get_jellyfin_log_path()
    try:
        result = subprocess.run(
            ["tail", "-n", str(lines), log_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            return None
        
        return result.stdout
    except Exception:
        return None


def main():
    print("=== Jellyfin Logs (last 30 lines) ===")
    print()
    
    # Сначала пробуем journalctl
    logs = get_journalctl_logs(30)
    
    # Если journalctl пустой, пробуем файл логов
    if not logs.strip():
        file_logs = get_file_logs()
        if file_logs:
            logs = file_logs
        else:
            logs = "Логи не найдены. Проверьте настройки логирования Jellyfin."
    
    print(logs)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
