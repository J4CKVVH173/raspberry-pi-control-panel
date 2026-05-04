import subprocess
import sys
import os

import config

INSTANCE_ID = os.environ["YANDEX_INSTANCE_ID"]


def run_command(cmd: list[str]) -> str:
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{result.stderr}")

    return result.stdout


def get_instance_status(instance_id: str) -> str:
    output = run_command(
        [
            config.get_yandex_cloud_path(),
            "compute",
            "instance",
            "get",
            "--id",
            instance_id,
        ]
    )

    for line in output.splitlines():
        if line.startswith("status:"):
            return line.split(":", 1)[1].strip()

    raise ValueError("Status field not found in yc output")


def main():
    print("Checking Yandex Cloud VM status...")
    print(f"Instance ID: {INSTANCE_ID}")
    print()

    # Симуляция ответа
    status = get_instance_status(INSTANCE_ID)

    print(f"Current status: {status}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
