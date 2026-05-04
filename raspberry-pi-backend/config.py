import os
from pathlib import Path
from typing import Dict, Set
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"

def get_script_path(category: str, script_name: str) -> str:
    """
    Get script path, preferring environment variable override.
    
    Env var format: PI_SCRIPT_YANDEX_START_VPS=/custom/path/start_vps.py
    """
    env_key = f"PI_SCRIPT_{category.upper()}_{script_name.upper()}"
    env_value = os.environ.get(env_key)
    if env_value:
        return env_value
    
    # Default: relative to project root
    default_path = SCRIPTS_DIR / category / f"{script_name}.py"
    return str(default_path)

SCRIPTS_CONFIG: Dict[str, Dict[str, str]] = {
    "yandex": {
        "start_vps": get_script_path("yandex", "start_vps"),
        "status": get_script_path("yandex", "check_status"),
    },
    "jellyfin": {
        "status": get_script_path("jellyfin", "check_status"),
        "logs": get_script_path("jellyfin", "get_logs"),
        "restart": get_script_path("jellyfin", "restart"),
    },
}

def get_allowed_mount_points() -> Set[str]:
    env_value = os.environ.get("PI_DISK_MOUNT_POINTS", "/,/boot/firmware,/mnt/SSD4TB/D")
    return set(p.strip() for p in env_value.split(",") if p.strip())

def get_disk_labels() -> Dict[str, str]:
    env_value = os.environ.get("PI_DISK_LABELS")
    if env_value:
        labels = {}
        for item in env_value.split(","):
            if ":" in item:
                mp, label = item.split(":", 1)
                labels[mp.strip()] = label.strip()
        return labels
    return {
        "/": "Системный диск",
        "/boot/firmware": "Boot раздел",
        "/mnt/SSD4TB/D": "SSD 4TB Данные",
    }

DISK_CONFIG = {
    "allowed_mount_points": get_allowed_mount_points(),
    "allowed_devices_pattern": os.environ.get("PI_DISK_DEVICE_PATTERN", r"mmcblk0p[12]|sd[a-z]+\d+"),
    "labels": get_disk_labels(),
}

# Utility functions for scripts
def get_yandex_cloud_path() -> str:
    return os.environ.get("PI_YC_PATH", "/usr/local/bin/yc")

def get_jellyfin_log_path() -> str:
    return os.environ.get("PI_JELLYFIN_LOG_PATH", "/var/log/jellyfin/jellyfin.log")

def get_jellyfin_cache_path() -> str:
    return os.environ.get("PI_JELLYFIN_CACHE_PATH", "/var/cache/jellyfin")