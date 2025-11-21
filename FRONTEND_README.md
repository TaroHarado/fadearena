# FadeArena Frontend

Next.js 14 frontend application for the FadeArena trading dashboard.

## Overview

The frontend provides a retro quant terminal-style interface for monitoring and controlling the FadeArena trading bot. It connects to the backend API and WebSocket server for real-time updates.

## Features

### Pages

- **`/`** - Landing page with project description and CTA
- **`/dashboard`** - Main application with tabbed interface:
  - **Live Tab** - Real-time equity chart and trade feed
  - **Models Tab** - Bot leaderboard with performance metrics
  - **Settings Tab** - Strategy configuration and risk controls

### Components

#### Layout Components
- **`TopNav`** - Navigation bar with logo, links, and status indicators (mode, kill switch)
- **`ErrorBanner`** - System health error display

#### Dashboard Components
- **`EquityChart`** - Multi-line chart showing bots aggregate vs FadeArena equity (Recharts)
- **`BotTable`** - Leaderboard table with:
  - Bot name and wallet address
  - Total and daily PnL
  - Trade count and win rate
  - Sharpe-like metric
  - Link to Hyperliquid explorer
- **`TradeFeed`** - Scrolling table of recent trades with:
  - Timestamp
  - Bot name
  - Asset symbol
  - Bot side vs FadeArena side
  - Size, price, PnL
- **`SettingsForm`** - Configuration form with:
  - Simulation/Live mode toggle
  - Global exposure cap
  - Daily loss limit
  - Per-bot enable/disable and leverage multiplier
  - Kill switch button

### Hooks

All hooks use React Query for data fetching and caching:

- **`useSystemState`** - System state, mode, equity, positions
- **`useModels`** - Bot list with stats
- **`useTrades`** - Trade history (paginated)
- **`useEquity`** - Equity time-series data
- **`useSettings`** - Strategy configuration
- **`useKillSwitch`** - Kill switch toggle
- **`useHealth`** - Backend health check
- **`useLiveEvents`** - WebSocket live updates

## Styling

The UI follows a "retro quant terminal" aesthetic inspired by nof1.ai:

### Color Palette
- Background: `#fafafa` (light gray)
- Surface: `#ffffff` (white)
- Border: `#e5e5e5` (light gray)
- Text: `#1a1a1a` (dark)
- Text Muted: `#666666` (gray)
- Green (positive PnL): `#00a86b`
- Red (negative PnL): `#dc3545`
- Amber (warnings): `#ffb800`

### Typography
- Monospace fonts for all numbers and data
- Small uppercase labels (11-12px)
- Dense, information-rich tables
- Thin borders (1px)

### Components
- Cards with thin borders
- Small uppercase buttons
- Status pills with colored borders
- Monospace numbers with tabular spacing

## Data Flow

1. **Initial Load**: React Query fetches data from REST API
2. **Live Updates**: WebSocket connects and merges events into UI
3. **Auto-refresh**: Queries refetch at intervals (5-10 seconds)
4. **Optimistic Updates**: Mutations update cache immediately

## API Integration

### REST Endpoints
- `GET /api/state` - System state (refetch: 5s)
- `GET /api/models` - Bot list (refetch: 10s)
- `GET /api/trades` - Trade history (refetch: 5s)
- `GET /api/equity` - Equity data (refetch: 10s)
- `GET /api/settings` - Configuration
- `POST /api/settings` - Update configuration
- `POST /api/kill-switch` - Toggle kill switch
- `GET /api/health` - Health check (refetch: 10s)

### WebSocket
- URL: `ws://localhost:3002/ws`
- Events: `bot-trade`, `my-trade`, `state-update`, `settings-update`, `error`
- Auto-reconnect on disconnect

## Development

```bash
# Install dependencies
pnpm install

# Run development server (port 3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002/ws
```

## Project Structure

```
apps/web/
├── app/
│   ├── dashboard/        # Dashboard pages
│   │   ├── layout.tsx    # Dashboard layout with TopNav
│   │   ├── page.tsx      # Main dashboard with tabs
│   │   ├── loading.tsx   # Loading state
│   │   └── error.tsx     # Error boundary
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Landing page
│   ├── providers.tsx     # React Query provider
│   └── globals.css       # Global styles
├── components/
│   ├── tabs/             # Tab components
│   ├── TopNav.tsx
│   ├── ErrorBanner.tsx
│   ├── EquityChart.tsx
│   ├── BotTable.tsx
│   ├── TradeFeed.tsx
│   └── SettingsForm.tsx
├── hooks/                # React Query hooks
├── lib/
│   └── mockData.ts       # Mock data for development
└── package.json
```

## Mock Data

If the backend is not available, you can use mock data from `lib/mockData.ts` for development. Update hooks to fall back to mocks when API calls fail.

## Responsive Design

The layout is optimized for laptop screens (1024px+) with:
- Dense tables that remain readable
- Horizontal scrolling for wide tables
- Fixed header navigation
- Sticky table headers in scrollable feeds

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Performance

- React Query caching reduces API calls
- WebSocket updates are merged efficiently
- Charts use Recharts with optimized rendering
- Tables use virtual scrolling for large datasets (can be added)

## Future Enhancements

- [ ] Virtual scrolling for trade feed
- [ ] Real-time chart updates from WebSocket
- [ ] Dark mode toggle
- [ ] Export trades to CSV
- [ ] Advanced filtering and search
- [ ] Mobile-responsive layout
- [ ] Performance metrics dashboard

