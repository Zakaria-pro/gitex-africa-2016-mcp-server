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
