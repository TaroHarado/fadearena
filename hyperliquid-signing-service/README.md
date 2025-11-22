# Hyperliquid Signing Service

Микросервис на Python, который использует официальный Hyperliquid Python SDK для подписи действий.

Это гарантирует 100% совместимость с требованиями Hyperliquid к подписи.

## Установка

```bash
# Создайте виртуальное окружение
python -m venv venv

# Активируйте его
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt
```

## Настройка

Создайте файл `.env` или установите переменные окружения:

```bash
ACCOUNT_ADDRESS=0x...  # Ваш основной кошелек (с депозитом)
SECRET_KEY=0x...       # Приватный ключ этого кошелька или API-кошелька
PORT=3003              # Порт для сервиса (по умолчанию 3003)
```

## Запуск

```bash
python main.py
```

Сервис будет доступен на `http://localhost:3003`

## API

### POST /sign

Подписывает действие используя официальный Hyperliquid Python SDK.

**Request:**
```json
{
  "action": {
    "type": "order",
    "orders": [{
      "a": 110000,
      "b": true,
      "p": "0",
      "s": "0.07856",
      "r": false,
      "t": {
        "limit": {
          "tif": "Ioc"
        }
      }
    }],
    "grouping": "na"
  },
  "nonce": 1763829549803
}
```

**Response:**
```json
{
  "signature": {
    "r": "0x...",
    "s": "0x...",
    "v": 27
  },
  "messageHash": "0x..."
}
```

### GET /health

Проверка здоровья сервиса.

**Response:**
```json
{
  "status": "ok",
  "service": "hyperliquid-signing-service",
  "account_configured": true
}
```


