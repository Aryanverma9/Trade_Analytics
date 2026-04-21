# Trade Analytics Dashboard

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/stackblitz-starters-j7wm7apa)

A dark-themed trading journal and analytics platform. Upload a CSV of your trades and get instant performance insights across 7 analytical views.

---

## Getting Started

### 1. Prepare your CSV

Your CSV file must include these columns:

| Column | Description | Example |
|---|---|---|
| `DATE` | Trade date in DD-MM-YYYY format | `01-08-2025` |
| `ENTRY TIME` | Entry time in HH:MM or HH;MM | `14:55` |
| `EXIT TIME` | Exit time in HH:MM or HH;MM | `15:15` |
| `P&L` | Profit or loss in currency units | `-100` |
| `DIRECTION` | Must be exactly `Long` or `Short` | `Short` |
| `MAX RR` | Risk-to-reward ratio achieved | `2` |
| `TRADE IMAGE` | *(Optional)* TradingView snapshot URL | `https://s3.tradingview.com/snapshots/...` |

A downloadable template is available on the upload screen.

### 2. Upload

Drag and drop your CSV onto the upload area, or click to browse. The dashboard loads instantly — no server, no account required.

---

## Dashboard Tabs

### Overview
High-level scorecard: win rate, profit factor, expectancy, max drawdown, win/loss streaks, and average R:R. Includes a strategy radar chart, win/loss pie, Long vs. Short breakdown, and a monthly summary table.

### Equity
Cumulative P&L curve with a rolling 10-trade win rate overlay. Side-by-side Long vs. Short equity comparison. Daily and monthly P&L bar charts.

### Time & Session
Performance broken down by trading session (Morning, Midday, Evening, Night), win rate by entry hour, and day-of-week analysis.

### Deep Dive
Trade duration buckets, expectancy distribution, and drawdown analysis across your trade history.

### Monte Carlo
Forward-looking risk simulation. Configure the number of future trades (50–500) and simulation runs (500–2000). Outputs probability of profit, median/best/worst case P&L, max drawdown percentiles, and an equity curve fan chart showing the 5th–95th percentile spread.

### Tradebook
Year-by-year heatmap calendar. Each day is color-coded by P&L intensity — bright green for strong profit days, red for losses, gray for no trades. Monthly win/loss/breakeven counts and totals are shown alongside.

### Trade Log
Full sortable trade list with per-trade details. Click any trade to open a modal showing the TradingView chart image (if provided), entry/exit times, duration, session, direction, P&L, and R:R.

---

## Tech Stack

- **React 18** + **Vite**
- **Recharts** for all charts
- **Tailwind CSS**
- Runs entirely in the browser — no backend required
