# FadeArena Web Frontend

Next.js 14 frontend for FadeArena trading dashboard.

## Features

- **Landing Page** (`/`) - Introduction and CTA
- **Dashboard** (`/dashboard`) - Main trading interface with tabs:
  - **Live** - Real-time equity chart and trade feed
  - **Models** - Bot leaderboard with performance metrics
  - **Settings** - Strategy configuration and risk controls

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query (TanStack Query)
- React Hook Form + Zod
- Recharts
- WebSocket for live updates

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002/ws
```

## Styling

The UI follows a "retro quant terminal" aesthetic inspired by nof1.ai:

- Light background (`#fafafa`)
- Thin borders (`#e5e5e5`)
- Monospace fonts for numbers and data
- Green/red PnL highlights
- Small uppercase labels
- Dense, information-rich tables

## Components

- `TopNav` - Navigation bar with status indicators
- `EquityChart` - Multi-line chart (bots vs FadeArena)
- `BotTable` - Leaderboard with bot performance
- `TradeFeed` - Scrolling list of recent trades
- `SettingsForm` - Strategy configuration form
- `ErrorBanner` - System health error display

## Hooks

- `useSystemState` - System state and mode
- `useModels` - Bot list and stats
- `useTrades` - Trade history
- `useEquity` - Equity time-series data
- `useSettings` - Strategy configuration
- `useKillSwitch` - Kill switch toggle
- `useHealth` - Backend health check
- `useLiveEvents` - WebSocket live updates

## API Integration

All API calls go through React Query with automatic refetching:

- State: Every 5 seconds
- Models: Every 10 seconds
- Trades: Every 5 seconds
- Equity: Every 10 seconds
- Health: Every 10 seconds

WebSocket connects automatically and merges live events into the UI.

