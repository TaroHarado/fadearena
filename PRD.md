# Product Requirements Document: FadeArena

## 1. Overview

**Product Name:** FadeArena  
**Version:** 1.0  
**Date:** 2024  
**Author:** Product/Technical Writer  

### 1.1 Purpose
FadeArena is a contrarian trading bot that automatically opens inverse positions to a fixed set of AI trading wallets participating in Hyperliquid's Alpha Arena. The system tracks these wallets' positions and fills in near real-time and mirrors their trades with opposite positions on the user's Hyperliquid account.

### 1.2 Target User
Single-user system (sole operator).

### 1.3 Core Value Proposition
Automate inverse trading against top-performing AI trading bots with configurable risk controls and real-time monitoring.

---

## 2. User Stories

### 2.1 Core Trading Functionality
- **US-1:** As a user, I want the system to automatically track positions and fills from target AI wallets (Gemini-3-Pro, Grok-4, Qwen3-Max, Kimi-K2-Thinking, Deepseek-Chat-v3.1, Claude-Sonnet) so that I can mirror their trades in real-time.
- **US-2:** As a user, I want the system to open inverse positions automatically when target wallets open positions, so that I don't need to manually monitor and execute trades.
- **US-3:** As a user, I want to configure leverage multipliers per bot, so that I can control my position sizing relative to each AI wallet's position size.
- **US-4:** As a user, I want to set per-asset exposure caps, so that I can limit risk concentration in specific assets.
- **US-5:** As a user, I want to set global exposure caps, so that I can limit total portfolio risk.
- **US-6:** As a user, I want to set daily loss limits, so that the system stops trading if losses exceed my threshold.
- **US-7:** As a user, I want to enable/disable individual bots, so that I can selectively mirror specific AI wallets.
- **US-8:** As a user, I want to run the system in simulation mode, so that I can test strategies without risking real capital.

### 2.2 Monitoring & Control
- **US-9:** As a user, I want to view a live dashboard showing aggregate equity curves (bots vs my inverse strategy), so that I can track overall performance.
- **US-10:** As a user, I want to see each bot's positions and my mirrored positions with PnL on a leaderboard page, so that I can compare performance per bot.
- **US-11:** As a user, I want to see system health status (Hyperliquid connection, last event, last order, kill switch), so that I can ensure the system is operating correctly.
- **US-12:** As a user, I want to configure all strategy parameters through a settings page, so that I can adjust risk controls without code changes.

### 2.3 Safety & Reliability
- **US-13:** As a user, I want a kill switch to immediately halt all trading, so that I can stop the system in emergencies.
- **US-14:** As a user, I want the system to handle API failures gracefully, so that temporary disconnections don't cause incorrect trades.

---

## 3. Functional Requirements

### 3.1 Data Tracking
- **FR-1:** System must poll Hyperliquid Info API (or use SDK) to track positions of target wallets at least every 5 seconds.
- **FR-2:** System must track recent fills from target wallets within the last 60 seconds.
- **FR-3:** System must maintain historical position data for at least 24 hours for PnL calculations.

### 3.2 Order Execution
- **FR-4:** System must use Hyperliquid Exchange API to place market orders for inverse positions.
- **FR-5:** System must calculate position sizes based on: target wallet position size × leverage multiplier × enabled status.
- **FR-6:** System must respect per-asset exposure caps before placing orders.
- **FR-7:** System must respect global exposure caps before placing orders.
- **FR-8:** System must check daily loss limit before placing any new orders.
- **FR-9:** System must close positions when target wallets close positions (inverse logic).
- **FR-10:** System must handle partial fills and position adjustments.

### 3.3 Configuration
- **FR-11:** System must support per-bot leverage multipliers (default: 1.0x, range: 0.1x - 10.0x).
- **FR-12:** System must support per-asset exposure caps (in USD, default: unlimited).
- **FR-13:** System must support global exposure cap (in USD, default: unlimited).
- **FR-14:** System must support daily loss limit (in USD, default: unlimited).
- **FR-15:** System must support per-bot enable/disable toggles (default: all enabled).
- **FR-16:** System must support simulation mode toggle (default: simulation).
- **FR-17:** All configuration must persist across restarts.

### 3.4 User Interface
- **FR-18:** Dashboard page must display:
  - Aggregate equity curve chart (bots combined vs my inverse strategy)
  - Real-time PnL metrics
  - Active positions count
  - System status indicator
- **FR-19:** Models/Leaderboard page must display:
  - Table/list of each bot with:
    - Bot name
    - Current positions (asset, size, side)
    - My mirrored positions (asset, size, side)
    - PnL for this bot's inverse strategy
    - Enable/disable toggle (inline)
- **FR-20:** Settings page must display:
  - Per-bot leverage multiplier inputs
  - Per-asset exposure cap inputs
  - Global exposure cap input
  - Daily loss limit input
  - Per-bot enable/disable toggles
  - Simulation/Live mode toggle
  - Kill switch button
  - Save/Reset buttons
- **FR-21:** System Health panel must display:
  - Hyperliquid connection status (connected/disconnected/latency)
  - Last event timestamp and type
  - Last order timestamp and details
  - Kill switch state (active/inactive)
- **FR-22:** UI must follow retro quant terminal aesthetic (inspired by nof1.ai):
  - Dark theme with green/amber terminal colors
  - Monospace fonts for data
  - Minimalist, data-dense layout
  - Terminal-style borders and dividers

### 3.5 Safety Features
- **FR-23:** Kill switch must immediately cancel all pending orders and prevent new orders.
- **FR-24:** System must log all trades, position changes, and configuration changes.
- **FR-25:** System must validate all configuration inputs (ranges, types) before saving.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-1:** Position tracking latency: < 5 seconds from target wallet position change to system detection.
- **NFR-2:** Order execution latency: < 2 seconds from position detection to order submission.
- **NFR-3:** UI update latency: < 1 second from backend state change to frontend display.
- **NFR-4:** API polling frequency: Maximum 1 request per second per endpoint to respect rate limits.

### 4.2 Reliability
- **NFR-5:** System uptime target: 99.5% (allows for planned maintenance).
- **NFR-6:** API failure handling: System must retry failed API calls with exponential backoff (max 3 retries).
- **NFR-7:** Connection recovery: System must automatically reconnect to Hyperliquid APIs within 30 seconds of disconnection.
- **NFR-8:** Data persistence: All critical state (positions, config, PnL) must be persisted to database/file storage.

### 4.3 Safety
- **NFR-9:** Simulation mode must never place real orders, even if misconfigured.
- **NFR-10:** All orders must include validation checks (exposure caps, loss limits) before submission.
- **NFR-11:** System must prevent duplicate orders for the same position within 10 seconds.
- **NFR-12:** Kill switch must be accessible from UI and must persist across restarts until manually deactivated.

### 4.4 Security
- **NFR-13:** API keys must be stored securely (environment variables, never in code).
- **NFR-14:** All API communications must use HTTPS.
- **NFR-15:** System must validate API responses before processing to prevent injection attacks.

### 4.5 Usability
- **NFR-16:** UI must be responsive and work on desktop browsers (Chrome, Firefox, Safari, Edge).
- **NFR-17:** All user-facing text must be in English.
- **NFR-18:** Settings page must provide clear validation error messages.

---

## 5. Technical Architecture

### 5.1 Technology Stack
- **Backend:** Node.js + TypeScript
- **Frontend:** Next.js + React + Tailwind CSS
- **APIs:** Hyperliquid Info API, Hyperliquid Exchange API (via SDK if available)
- **Data Storage:** TBD (SQLite/PostgreSQL/file-based JSON for MVP)

### 5.2 System Components
1. **Position Tracker Service:** Polls Hyperliquid Info API for target wallet positions/fills
2. **Strategy Engine:** Calculates inverse positions, applies risk controls, generates orders
3. **Order Execution Service:** Submits orders via Hyperliquid Exchange API
4. **Configuration Manager:** Handles settings persistence and validation
5. **Web API:** REST/GraphQL API for frontend communication
6. **Frontend:** Next.js pages (Dashboard, Models/Leaderboard, Settings, System Health)

### 5.3 Data Flow
1. Position Tracker detects target wallet position change
2. Strategy Engine calculates inverse position (size × leverage)
3. Risk controls check (exposure caps, loss limits, enabled status)
4. Order Execution Service submits order (if simulation mode: log only)
5. Frontend polls backend for updates and displays in UI

---

## 6. Success Metrics

### 6.1 Functional Metrics
- **SM-1:** Position tracking accuracy: > 99% (all target wallet positions detected within 5 seconds)
- **SM-2:** Order execution success rate: > 95% (orders successfully placed)
- **SM-3:** Configuration persistence: 100% (all settings saved and restored correctly)

### 6.2 Performance Metrics
- **SM-4:** Average position detection latency: < 3 seconds
- **SM-5:** Average order execution latency: < 1.5 seconds
- **SM-6:** UI responsiveness: < 500ms for all interactions

### 6.3 Reliability Metrics
- **SM-7:** System uptime: > 99.5%
- **SM-8:** API error recovery rate: > 90% (errors handled without manual intervention)

---

## 7. MVP Scope

### 7.1 MVP (Must Have)
- ✅ Track positions from all 6 target wallets (Gemini-3-Pro, Grok-4, Qwen3-Max, Kimi-K2-Thinking, Deepseek-Chat-v3.1, Claude-Sonnet)
- ✅ Open inverse positions automatically
- ✅ Per-bot leverage multipliers
- ✅ Global exposure cap
- ✅ Daily loss limit
- ✅ Per-bot enable/disable toggles
- ✅ Simulation mode
- ✅ Live dashboard with aggregate equity curve
- ✅ Models/Leaderboard page with positions and PnL
- ✅ Settings page for all parameters
- ✅ System health panel (connection status, last event, last order, kill switch)
- ✅ Kill switch functionality
- ✅ Retro terminal UI aesthetic

### 7.2 Nice-to-Have (Post-MVP)
- ⏳ Per-asset exposure caps (can use global cap in MVP)
- ⏳ Historical performance charts (beyond 24 hours)
- ⏳ Email/SMS alerts for system errors or daily loss limit breaches
- ⏳ Advanced order types (limit orders, stop-loss on inverse positions)
- ⏳ Position sizing algorithms beyond simple multiplier (e.g., Kelly Criterion)
- ⏳ Multi-account support
- ⏳ Backtesting engine
- ⏳ Export trades to CSV
- ⏳ Real-time WebSocket updates (instead of polling)
- ⏳ Mobile-responsive UI

---

## 8. Out of Scope
- Multi-user support
- Support for wallets other than the 6 specified AI bots
- Integration with exchanges other than Hyperliquid
- Social features (sharing, leaderboards with other users)
- Native mobile apps
- Advanced charting/technical analysis tools

---

## 9. Risks & Mitigations

### 9.1 Technical Risks
- **Risk:** Hyperliquid API rate limits may prevent real-time tracking
  - **Mitigation:** Implement intelligent polling with backoff, consider WebSocket if available
- **Risk:** API downtime could cause missed positions
  - **Mitigation:** Implement retry logic, alert user on extended downtime
- **Risk:** Incorrect position calculations could lead to unexpected losses
  - **Mitigation:** Extensive testing in simulation mode, validation checks before order submission

### 9.2 Operational Risks
- **Risk:** Daily loss limit may be hit during high volatility
  - **Mitigation:** Clear UI indicators, automatic halt, user notification
- **Risk:** Configuration errors could cause unintended trading
  - **Mitigation:** Simulation mode by default, validation on all inputs, confirmation dialogs for live mode

---

## 10. Dependencies
- Hyperliquid Info API availability and documentation
- Hyperliquid Exchange API availability and documentation
- Hyperliquid SDK (if available) for Node.js/TypeScript
- Reliable internet connection for API access
- Hyperliquid account with API keys

---

## 11. Open Questions
1. What is the exact Hyperliquid API rate limit structure?
2. Does Hyperliquid provide WebSocket streams for real-time position updates?
3. What is the recommended data persistence solution (SQLite vs PostgreSQL vs file-based)?
4. Should the system handle margin calls or rely on Hyperliquid's native margin system?
5. What is the minimum account balance required for effective inverse trading?

---

## 12. Appendix

### 12.1 Target AI Wallets
- Gemini-3-Pro
- Grok-4
- Qwen3-Max
- Kimi-K2-Thinking
- Deepseek-Chat-v3.1
- Claude-Sonnet

### 12.2 UI Reference
- Aesthetic inspiration: nof1.ai (retro quant terminal style)
- Key visual elements: dark theme, green/amber terminal colors, monospace fonts, data-dense layout

---

**Document Status:** Ready for Engineering Review  
**Next Steps:** Technical design review, API integration research, architecture planning

