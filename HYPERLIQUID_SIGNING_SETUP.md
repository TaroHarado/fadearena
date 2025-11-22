# Настройка Hyperliquid Signing Service

## Проблема

Локальная проверка подписи проходит успешно, но Hyperliquid восстанавливает другой адрес из подписи. Это происходит потому, что Hyperliquid использует **другие данные** для восстановления адреса, чем те, которые мы подписываем локально.

## Решение

Используем официальный Python SDK Hyperliquid через микросервис для подписи. Это гарантирует 100% совместимость.

## Шаг 1: Установка Python сервиса

**На Windows используйте команду `py` вместо `python`:**

```powershell
cd hyperliquid-signing-service

# Создайте виртуальное окружение
py -m venv venv

# Установите зависимости (используя Python из venv)
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

**Или активируйте виртуальное окружение и используйте pip:**

```powershell
# Активируйте виртуальное окружение
.\venv\Scripts\Activate.ps1

# Установите зависимости
pip install -r requirements.txt
```

## Шаг 2: Настройка

Создайте файл `.env` в папке `hyperliquid-signing-service/`:

```bash
# Ваш основной кошелек (с депозитом на Hyperliquid)
ACCOUNT_ADDRESS=0x894f3a60c06e9e96d251fd9137ce0962969e924b

# Приватный ключ этого кошелька (или API-кошелька, если используете)
SECRET_KEY=0x...

# Порт для сервиса (по умолчанию 3003)
PORT=3003
```

**Важно:**
- Если используете **основной кошелек** (тот, что в UI с депозитом): `ACCOUNT_ADDRESS` = адрес кошелька, `SECRET_KEY` = его приватный ключ
- Если используете **API-кошелек**: `ACCOUNT_ADDRESS` = основной кошелек (с депозитом), `SECRET_KEY` = приватный ключ API-кошелька

## Шаг 3: Запуск Python сервиса

**На Windows:**

```powershell
# Используйте Python из виртуального окружения
.\venv\Scripts\python.exe main.py
```

**Или активируйте виртуальное окружение:**

```powershell
.\venv\Scripts\Activate.ps1
python main.py
```

Сервис будет доступен на `http://localhost:3003`

Проверьте, что сервис работает:
```bash
curl http://localhost:3003/health
```

Должен вернуть:
```json
{
  "status": "ok",
  "service": "hyperliquid-signing-service",
  "account_configured": true
}
```

## Шаг 4: Настройка Worker

Worker автоматически использует Python сервис, если он доступен. Если сервис недоступен, он автоматически переключится на локальную подпись (fallback).

Чтобы отключить Python сервис и использовать только локальную подпись, передайте `false` в конструктор:

```typescript
const exchangeClient = new HyperliquidExchangeClient(
  'https://api.hyperliquid.xyz/exchange',
  walletAddress,
  privateKey,
  false // usePythonSigningService = false
);
```

## Шаг 5: Проверка

1. Запустите Python сервис
2. Запустите worker: `pnpm dev:worker`
3. В логах должно быть: `"Python signing service is available"`
4. При размещении ордера должно быть: `"Action signed via Python service"`

## Troubleshooting

### Python сервис не запускается

**Ошибка:** `hyperliquid-python-sdk not found`

**Решение:**
```bash
pip install hyperliquid-python-sdk
```

### Worker не может подключиться к Python сервису

**Проверьте:**
1. Python сервис запущен на порту 3003
2. Переменная окружения `HYPERLIQUID_SIGNING_SERVICE_URL` не переопределена (по умолчанию `http://localhost:3003`)

### Python сервис возвращает ошибку

**Проверьте:**
1. `ACCOUNT_ADDRESS` и `SECRET_KEY` правильно установлены в `.env`
2. Приватный ключ соответствует адресу
3. Кошелек зарегистрирован на Hyperliquid (есть депозит)

## Альтернатива: Использование только локальной подписи

Если вы хотите продолжить отладку локальной подписи, передайте `false` в конструктор `HyperliquidExchangeClient`. Но учтите, что проблема с восстановлением адреса может быть связана с тонкостями msgpack сериализации, которые сложно воспроизвести без официального SDK.

