# FadeArena Technical Documentation Index

This directory contains the complete technical architecture and API specification for FadeArena.

## Documents

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - System architecture overview
   - Monorepo structure and module responsibilities
   - Data flow diagrams
   - Hyperliquid API integration details
   - Simulation vs Live mode implementation
   - Kill switch mechanism
   - Error handling strategies

2. **[API_SPEC.md](./API_SPEC.md)**
   - Complete REST API specification (OpenAPI-style)
   - All endpoints with request/response schemas
   - WebSocket protocol documentation
   - Query parameters and validation rules
   - Status codes and error handling

3. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**
   - Entity Relationship Diagram (ERD)
   - Detailed table descriptions
   - Relationships and foreign keys
   - Index strategies
   - Query patterns
   - Data flow through schema

4. **[packages/shared/types.ts](./packages/shared/types.ts)**
   - Complete TypeScript interface definitions
   - Hyperliquid API types (raw)
   - Core domain types (BotTradeEvent, StrategyDecision, etc.)
   - API response types
   - WebSocket message types
   - Utility types and constants

5. **[prisma/schema.prisma](./prisma/schema.prisma)**
   - Prisma ORM schema definition
   - All database models with fields and types
   - Relationships and indexes
   - Ready for `prisma generate` and migrations

## Quick Start for Engineers

1. **Read ARCHITECTURE.md** to understand the system design
2. **Review types.ts** to understand data structures
3. **Check schema.prisma** for database models
4. **Reference API_SPEC.md** when implementing endpoints
5. **Use DATABASE_SCHEMA.md** for query optimization

## Implementation Order

1. Set up monorepo structure
2. Initialize Prisma and run migrations
3. Implement `trading-client` (Hyperliquid API wrapper)
4. Implement `bot-ingestor` (position tracking)
5. Implement `strategy-engine` (decision logic)
6. Implement `core-api` (REST + WebSocket server)
7. Build Next.js frontend (reference API_SPEC.md)

## Key Integration Points

- **Hyperliquid Info API**: Used by `trading-client` → `bot-ingestor`
- **Hyperliquid Exchange API**: Used by `trading-client` → `strategy-engine`
- **PostgreSQL**: Used by all modules via Prisma
- **WebSocket**: Used by `core-api` → Next.js frontend

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `HYPERLIQUID_API_URL` - Mainnet or testnet base URL
- `HYPERLIQUID_WALLET_PRIVATE_KEY` - Private key for signing orders
- `NODE_ENV` - development | production

