# Options Advisor

AI-powered options trade recommendation app for Robinhood users. Built with React + Vite. Uses the Anthropic API with live web search to generate comprehensive trade recommendations.

## Setup

```bash
npm install
npm run dev
```

## Tech Stack
- React 18 + Vite
- Anthropic API (claude-sonnet-4-20250514) with web_search tool
- Apple HIG design system (vanilla CSS)
- No other dependencies

## Architecture

```
src/
├── App.jsx          # Root component + layout
├── api.js           # Anthropic API call + system prompt
├── styles.css       # Apple HIG design tokens + all styles
└── components/
    ├── SearchBar.jsx
    ├── TradeCard.jsx        # Tab orchestrator (Summary | Greeks | Analysis)
    ├── SummarySection.jsx   # Plain-English summary, exit rules, scenarios
    ├── GreeksSection.jsx    # IV rank + intuitive Greek explanations
    └── AnalysisSection.jsx  # Full rationale, risk, dates, signals, Robinhood steps
```

## API Key
The Anthropic API key is handled by the claude.ai proxy at `/v1/messages`. No key needed in development via the proxy. For standalone deployment, add `x-api-key` header in `src/api.js`.

## Extending
- Add a **trade journal** (localStorage) to track entries/exits
- Add **P&L tracker** with real-time price polling
- Add **portfolio Greeks** aggregation across open positions
- Add **watchlist** so recommendations persist across sessions
- Consider **Tastytrade API** integration for direct order placement

## Notes
- All recommendations are for educational purposes only
- Options trading involves substantial risk of loss
- Always verify live prices in Robinhood before entering a trade
