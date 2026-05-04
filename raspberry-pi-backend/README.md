# Raspberry Pi Dashboard Backend

Локальный сервер для управления скриптами на Raspberry Pi через веб-интерфейс.

## Структура проекта

```
raspberry-pi-backend/
├── main.py                 # FastAPI сервер
├── requirements.txt        # Зависимости Python
├── README.md              # Эта инструкция
└── scripts/               # Ваши скрипты управления
    ├── yandex/
    │   ├── start_vps.py   # Запуск VPS
    │   └── check_status.py # Проверка статуса VPS
    └── jellyfin/
        ├── check_status.py # Статус Jellyfin
        ├── get_logs.py    # Логи Jellyfin
        └── restart.py     # Перезапуск Jellyfin
```

## Быстрый старт

### 1. Установка зависимостей

```bash
# Создайте виртуальное окружение (рекомендуется)
python3 -m venv venv
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt
```

### 2. Настройка путей к скриптам

Отредактируйте `main.py` и укажите реальные пути к вашим скриптам:

```python
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
```

### 3. Запуск сервера

```bash
# Разработка (с автоперезагрузкой)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Продакшен
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Проверка работы

Откройте в браузере:
- API документация: http://raspberry-pi:8000/docs
- Health check: http://raspberry-pi:8000/api/health

## Автозапуск при загрузке

### Systemd сервис

Создайте файл `/etc/systemd/system/pi-dashboard.service`:

```ini
[Unit]
Description=Raspberry Pi Dashboard API
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/raspberry-pi-backend
Environment="PATH=/home/pi/raspberry-pi-backend/venv/bin"
ExecStart=/home/pi/raspberry-pi-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Активируйте сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pi-dashboard
sudo systemctl start pi-dashboard
```

## API Эндпоинты

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | /api/yandex/start-vps | Запуск VPS в Яндекс Облаке |
| POST | /api/yandex/status | Статус VPS |
| POST | /api/jellyfin/status | Статус Jellyfin |
| POST | /api/jellyfin/logs | Логи Jellyfin |
| POST | /api/jellyfin/restart | Перезапуск Jellyfin |
| GET | /api/system/status | Статус системы Raspberry Pi |
| GET | /api/health | Проверка работоспособности |
| GET | /api/commands | Список доступных команд |

## Безопасность

⚠️ **Важно**: Этот сервер предназначен только для локальной сети!

1. **Только разрешённые скрипты**: Сервер выполняет только скрипты, указанные в `SCRIPTS_CONFIG`
2. **Без shell-инъекций**: Используется `subprocess` с параметрами, а не shell
3. **Таймауты**: Все скрипты имеют ограничение по времени выполнения

### Рекомендации для продакшена:

1. Ограничьте доступ на уровне файрвола:
   ```bash
   sudo ufw allow from 192.168.1.0/24 to any port 8000
   ```

2. Используйте nginx как reverse proxy с базовой аутентификацией

3. Настройте HTTPS для шифрования трафика

## Добавление новых команд

1. Создайте Python скрипт в папке `scripts/`
2. Добавьте путь в `SCRIPTS_CONFIG` в `main.py`
3. Создайте эндпоинт:

```python
@app.post("/api/myservice/mycommand", response_model=CommandResponse)
async def my_new_command():
    """Описание команды"""
    return await execute_script(SCRIPTS_CONFIG["myservice"]["mycommand"])
```

4. Обновите frontend (добавьте кнопку в соответствующий раздел)

## Troubleshooting

### Скрипт не найден
Проверьте:
- Путь в `SCRIPTS_CONFIG` указан правильно
- Файл существует и имеет права на выполнение (`chmod +x script.py`)

### Ошибка разрешений
Для команд, требующих sudo (например, systemctl):
- Добавьте пользователя в sudoers без пароля для конкретных команд
- Или запускайте сервер от root (не рекомендуется)

```bash
# /etc/sudoers.d/pi-dashboard
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart jellyfin
pi ALL=(ALL) NOPASSWD: /bin/systemctl stop jellyfin
pi ALL=(ALL) NOPASSWD: /bin/systemctl start jellyfin
```

### Сервер не отвечает
```bash
# Проверьте статус сервиса
sudo systemctl status pi-dashboard

# Посмотрите логи
sudo journalctl -u pi-dashboard -f
```
