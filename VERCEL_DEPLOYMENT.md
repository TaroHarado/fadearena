# Деплой на Vercel

## Структура проекта

Проект использует monorepo структуру с pnpm workspace:
- `apps/web` - Next.js фронтенд
- `packages/api` - Express API сервер
- `packages/shared` - Общие типы и утилиты

## Варианты деплоя

### Вариант 1: Next.js + Отдельный API сервер (Рекомендуется)

1. **Деплой Next.js на Vercel**
   - Root directory: `apps/web`
   - Build command: `cd ../.. && pnpm install && pnpm --filter @fadearena/web build`
   - Output directory: `.next`

2. **Деплой API на отдельном сервисе** (Railway, Fly.io, или другой)
   - Используйте существующий `packages/api`
   - Настройте переменные окружения
   - Укажите URL API в `NEXT_PUBLIC_API_URL` на Vercel

### Вариант 2: Все на Vercel через API Routes

Требует рефакторинга API в Next.js API routes (более сложно).

## Переменные окружения для Vercel

### Next.js (Vercel)

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### API сервер (отдельный)

Все переменные из `.env`:
- `DATABASE_URL`
- `MY_GEMINI_FADE_WALLET`
- `MY_GROK_FADE_WALLET`
- `MY_QWEN_FADE_WALLET`
- `MY_KIMI_FADE_WALLET`
- `MY_DEEPSEEK_FADE_WALLET`
- `MY_CLAUDE_FADE_WALLET`
- И другие...

## Инструкция по деплою

### Шаг 1: Подготовка

1. Убедитесь, что проект в Git репозитории
2. Закоммитьте все изменения

### Шаг 2: Деплой Next.js на Vercel

1. Зайдите на [vercel.com](https://vercel.com)
2. Импортируйте Git репозиторий
3. Настройте проект:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @fadearena/web build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

4. Добавьте переменные окружения:
   - `NEXT_PUBLIC_API_URL` - URL вашего API сервера

5. Деплой!

### Шаг 3: Деплой API (Railway/Fly.io)

Следуйте инструкциям в `FLY_DEPLOYMENT.md` или используйте Railway.

## Проверка

После деплоя проверьте:
- ✅ Лендинг открывается
- ✅ Дашборд загружается
- ✅ API запросы работают (проверьте Network tab)
- ✅ Чарты отображаются
- ✅ Данные обновляются



