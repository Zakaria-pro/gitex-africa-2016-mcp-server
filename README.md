# GITEX Africa 2026 MCP Server

An MCP (Model Context Protocol) server that turns the GITEX Africa 2026
exhibitor catalog into a queryable intelligence layer — built for founders,
investors, and ecosystem builders who want to walk in with a plan, not a map.

## What It Does

This server exposes the GITEX Africa 2026 exhibitor data as structured tools
that any MCP-compatible AI client (like Claude) can call in natural language.
Instead of browsing a static catalog, you can ask:

- "Find EdTech exhibitors targeting universities"
- "Which cloud and AI companies are attending?"
- "Show me my saved favorites"
- "Match exhibitors to my investor profile"

## Tools Exposed

| Tool | Description |
|---|---|
| `search_exhibitors` | Search by keyword, country, or sector/category |
| `get_exhibitor_detail` | Full profile for a specific exhibitor |
| `list_categories` | All sector tags available in the catalog |
| `match_by_profile` | Free-text profile matching against exhibitor data |
| `add_to_favorites` | Save an exhibitor for follow-up |
| `list_favorites` | View all saved favorites |
| `search_speakers` | Search speakers by topic, name, or organization |

## Stack

- **Runtime:** Node.js
- **Protocol:** MCP (Model Context Protocol)
- **Data:** `exhibitors.json` — scraped and structured catalog
- **Scraper:** `scrape.js` — data collection script
- **Transport:** Stdio (compatible with Claude Desktop, Claude.ai, and
  other MCP clients)

## Quick Start
```bash
git clone https://github.com/Zakaria-pro/gitex-africa-2016-mcp-server.git
cd gitex-africa-2016-mcp-server
npm install
node server.js
```

### Connect to Claude Desktop

Add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "gitex-africa": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"]
    }
  }
}
```

## Origin Story

Built as an MVP demo for GITEX Africa 2026 (April 7-9, Marrakech) to showcase
what an AI-native event intelligence layer looks like in practice. The server
was demonstrated live to the Country Chief Representative as a proof of concept
for grounding AI agents in structured real-world event data.

## Use Cases

- **Founders** preparing targeted meeting lists before the event
- **Investors** screening for sectors and geographies of interest
- **Ecosystem builders** mapping the landscape across 1,400+ exhibitors
- **Anyone** who wants signal, not noise, from a large trade show

## Files
```
server.js          # MCP server — tool definitions and handlers
scrape.js          # Scraper used to build the exhibitor dataset
exhibitors.json    # Structured exhibitor catalog
favorites.json     # Persisted favorites store
```

## Event

**GITEX Africa 2026**
April 7-9, 2026 | Marrakech, Morocco
[gitexafrica.com](https://gitexafrica.com)

---

Built by [Zakariae](https://github.com/Zakaria-pro) — co-founder of
[Willowcy](https://willowcy.com) and [Tawjih.ai](https://tawjih.ai)
