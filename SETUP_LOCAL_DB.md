# Настройка локальной базы данных для FadeArena

## Вариант 1: Docker (Рекомендуется)

Если у вас установлен Docker:

```bash
# Запустить PostgreSQL контейнер
docker run --name fadearena-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fadearena -p 5432:5432 -d postgres:15-alpine

# Проверить что контейнер запущен
docker ps

# Остановить (если нужно)
docker stop fadearena-db

# Запустить снова
docker start fadearena-db
```

## Вариант 2: Локальная установка PostgreSQL

### Windows

1. Скачайте PostgreSQL с https://www.postgresql.org/download/windows/
2. Установите с паролем `postgres` для пользователя `postgres`
3. Создайте базу данных:
   ```sql
   CREATE DATABASE fadearena;
   ```

### macOS

```bash
# Установить через Homebrew
brew install postgresql@15

# Запустить сервис
brew services start postgresql@15

# Создать базу данных
createdb fadearena
```

### Linux (Ubuntu/Debian)

```bash
# Установить
sudo apt update
sudo apt install postgresql postgresql-contrib

# Запустить сервис
sudo systemctl start postgresql

# Создать базу данных
sudo -u postgres createdb fadearena
```

## Вариант 3: SQLite (для быстрого тестирования)

Если PostgreSQL недоступен, можно временно использовать SQLite:

1. Измените `packages/shared/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. Обновите `.env`:
   ```
   DATABASE_URL="file:./dev.db"
   ```

**Внимание:** SQLite имеет ограничения и не рекомендуется для production!

## Проверка подключения

После настройки базы данных, проверьте подключение:

```bash
# Для PostgreSQL
psql -U postgres -d fadearena -c "SELECT 1;"

# Или через переменную окружения
psql $DATABASE_URL -c "SELECT 1;"
```

## Следующие шаги

После настройки базы данных:

```bash
# Сгенерировать Prisma client
pnpm db:generate

# Запустить миграции
pnpm db:migrate

# Заполнить начальными данными
pnpm db:seed
```

