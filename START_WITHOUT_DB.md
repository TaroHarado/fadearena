# Запуск FadeArena без базы данных (для проверки кода)

Если база данных еще не настроена, можно проверить что код компилируется:

## 1. Установить зависимости

```bash
# Если pnpm не установлен, используйте npm
npm install -g pnpm

# Или используйте npm напрямую (нужно будет адаптировать скрипты)
npm install
```

## 2. Проверить TypeScript

```bash
# Проверить типы без запуска
pnpm typecheck
```

## 3. Собрать проекты

```bash
# Собрать все пакеты
pnpm build
```

## 4. Настроить базу данных

См. `SETUP_LOCAL_DB.md` для инструкций по настройке PostgreSQL или SQLite.

## Быстрая проверка структуры

```bash
# Проверить что все файлы на месте
ls packages/shared/prisma/schema.prisma
ls packages/api/src/index.ts
ls packages/worker/src/index.ts
ls apps/web/app/page.tsx
```

## Текущий статус

- ✅ Node.js установлен (v22.12.0)
- ❌ pnpm не установлен (нужно: `npm install -g pnpm`)
- ❌ Docker не установлен (опционально, для базы данных)
- ✅ .env файл создан
- ⏳ База данных не настроена

## Рекомендации

1. **Установите pnpm:**
   ```bash
   npm install -g pnpm
   ```

2. **Настройте базу данных:**
   - Вариант A: Установите Docker и используйте контейнер PostgreSQL
   - Вариант B: Установите PostgreSQL локально
   - Вариант C: Используйте SQLite для тестирования (см. SETUP_LOCAL_DB.md)

3. **После настройки БД:**
   ```bash
   pnpm install
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   pnpm dev
   ```

