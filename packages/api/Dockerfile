# ============================================================================
# FadeArena API Dockerfile
# ============================================================================
# Build context: корень репозитория (где находится package.json)
# Dockerfile location: packages/api/Dockerfile
# 
# Этот Dockerfile:
# - НЕ зависит от host node_modules (все зависимости устанавливаются внутри контейнера)
# - Генерирует Prisma client внутри контейнера из packages/shared/prisma/schema.prisma
# - Использует multi-stage build для минимального размера финального образа
# ============================================================================

FROM node:18-alpine AS base

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
# Устанавливаем только зависимости, без исходного кода
# Это позволяет кэшировать слой зависимостей отдельно от кода
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем файлы конфигурации workspace (необходимы для pnpm install)
COPY package.json pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ./

# Копируем package.json файлы всех необходимых пакетов
# Это позволяет pnpm правильно разрешить workspace зависимости
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Устанавливаем pnpm
RUN npm install -g pnpm@latest


# Устанавливаем все зависимости (включая devDependencies для сборки)
# --frozen-lockfile гарантирует, что используются точные версии из lockfile
# ВАЖНО: Все зависимости устанавливаются внутри контейнера, не копируются с хоста
RUN pnpm install


# ============================================================================
# Stage 2: Builder
# ============================================================================
# Собираем приложение: генерируем Prisma client, компилируем TypeScript
FROM base AS builder
WORKDIR /app

# Копируем файлы конфигурации workspace (нужны для pnpm)
COPY package.json pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ./

# Копируем установленные зависимости из стадии deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules

# Копируем исходный код shared пакета (нужен для Prisma schema и TypeScript)
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/prisma ./packages/shared/prisma

# Копируем исходный код API пакета
COPY packages/api/package.json ./packages/api/
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/api/src ./packages/api/src

# Генерируем Prisma client внутри контейнера
# ВАЖНО: Prisma client генерируется из schema.prisma внутри контейнера,
# а НЕ копируется из host node_modules
WORKDIR /app/packages/shared
RUN npx prisma generate --schema=./prisma/schema.prisma
# Собираем shared пакет (TypeScript → JavaScript)
RUN npm install -g pnpm@latest
RUN pnpm build

# Собираем API пакет (TypeScript → JavaScript)
WORKDIR /app/packages/api
RUN npm install -g pnpm@latest
RUN pnpm build

# ============================================================================
# Stage 3: Runner (Production)
# ============================================================================
# Финальный образ содержит только production зависимости и собранные файлы
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Создаем непривилегированного пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fadearena

# Копируем файлы конфигурации workspace
COPY package.json pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Устанавливаем pnpm
RUN npm install -g pnpm@latest


# Копируем все node_modules из builder стадии (включая сгенерированный Prisma client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules

# Копируем собранные JavaScript файлы
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Копируем Prisma schema (нужен для миграций и seed скриптов)
COPY --from=builder /app/packages/shared/prisma ./packages/shared/prisma

# Переключаемся на рабочую директорию API
WORKDIR /app/packages/api

# Переключаемся на непривилегированного пользователя
USER fadearena

EXPOSE 3001

# Health check для мониторинга состояния API
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Запускаем API
CMD ["node", "dist/index.js"]
