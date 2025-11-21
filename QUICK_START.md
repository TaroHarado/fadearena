# FadeArena Quick Start

Get FadeArena running locally in 5 minutes.

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL (or Docker)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env - at minimum set DATABASE_URL

# 3. Setup database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Start everything
pnpm dev
```

## Verify

```bash
# Check health
curl http://localhost:3001/api/health

# Open frontend
open http://localhost:3000
```

## What You Should See

- ✅ API running on port 3001
- ✅ Worker running and updating heartbeat
- ✅ Frontend on port 3000
- ✅ Dashboard with SIMULATION mode pill
- ✅ No error banners

## Troubleshooting

**Database connection failed?**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env

**Port already in use?**
- Change PORT in .env for API
- Or kill process using the port

**Frontend can't connect?**
- Check API is running: `curl http://localhost:3001/api/health`
- Verify NEXT_PUBLIC_API_URL in .env

See `RUN_LOCAL.md` for detailed guide.

