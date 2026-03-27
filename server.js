/**
 * GITEX Africa 2026 MCP Server
 * Provides personalized exhibitor discovery tools for LLM clients (Claude, ChatGPT, etc.)
 *
 * Pitch context: This prototype uses publicly scraped data.
 * The production version would be powered by GITEX Africa's official data feed
 * through a formal partnership with the organizers.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

function loadExhibitors() {
  try {
    return JSON.parse(readFileSync(join(__dirname, 'exhibitors.json'), 'utf-8'));
  } catch {
    return [];
  }
}

function loadSpeakers() {
  try {
    return JSON.parse(readFileSync(join(__dirname, 'speakers.json'), 'utf-8'));
  } catch {
    return [];
  }
}

function loadFavorites() {
  if (!existsSync(join(__dirname, 'favorites.json'))) return [];
  try {
    return JSON.parse(readFileSync(join(__dirname, 'favorites.json'), 'utf-8'));
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  writeFileSync(join(__dirname, 'favorites.json'), JSON.stringify(favorites, null, 2));
}

const EXHIBITORS = loadExhibitors();

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function scoreExhibitor(exhibitor, query) {
  const q = normalize(query);
  const terms = q.split(/\s+/).filter(Boolean);
  let score = 0;

  const nameN = normalize(exhibitor.name);
  const descN = normalize(exhibitor.description);
  const countryN = normalize(exhibitor.country);
  const catsN = exhibitor.categories.map(normalize).join(' ');

  for (const term of terms) {
    if (nameN.includes(term)) score += 10;
    if (catsN.includes(term)) score += 6;
    if (countryN.includes(term)) score += 4;
    if (descN.includes(term)) score += 2;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

function searchExhibitors({ keyword, country, category }) {
  let results = EXHIBITORS;

  if (country) {
    const c = normalize(country);
    results = results.filter(e => normalize(e.country).includes(c));
  }

  if (category) {
    const cat = normalize(category);
    results = results.filter(e =>
      e.categories.some(ec => normalize(ec).includes(cat))
    );
  }

  if (keyword) {
    const kw = normalize(keyword);
    results = results
      .map(e => ({ ...e, _score: scoreExhibitor(e, keyword) }))
      .filter(e => e._score > 0 || normalize(e.name).includes(kw) || normalize(e.description).includes(kw))
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...e }) => e);
  }

  return results.slice(0, 20).map(e => ({
    name: e.name,
    stand: e.stand,
    country: e.country,
    categories: e.categories,
    description: e.description.substring(0, 200) + (e.description.length > 200 ? '...' : ''),
    profileUrl: e.profileUrl,
  }));
}

function getExhibitorDetail({ name }) {
  const n = normalize(name);
  const exhibitor = EXHIBITORS.find(e =>
    normalize(e.name) === n || normalize(e.name).includes(n)
  );

  if (!exhibitor) {
    return { error: `No exhibitor found matching "${name}"` };
  }

  return exhibitor;
}

function listCategories() {
  const counts = {};
  for (const e of EXHIBITORS) {
    for (const cat of e.categories) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));
}

function matchByProfile({ userProfile }) {
  if (!userProfile) return { error: 'userProfile is required' };

  // Score each exhibitor against the user's free-text profile
  const scored = EXHIBITORS
    .map(e => ({ ...e, _score: scoreExhibitor(e, userProfile) }))
    .filter(e => e._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);

  if (scored.length === 0) {
    return {
      message: 'No strong matches found. Try a broader description.',
      suggestions: EXHIBITORS.slice(0, 5).map(e => e.name),
    };
  }

  return scored.map(({ _score, ...e }) => ({
    name: e.name,
    stand: e.stand,
    country: e.country,
    categories: e.categories,
    description: e.description.substring(0, 200) + (e.description.length > 200 ? '...' : ''),
    profileUrl: e.profileUrl,
    matchScore: _score,
  }));
}

function addToFavorites({ exhibitorName }) {
  const n = normalize(exhibitorName);
  const exhibitor = EXHIBITORS.find(e =>
    normalize(e.name) === n || normalize(e.name).includes(n)
  );

  if (!exhibitor) {
    return { error: `No exhibitor found matching "${exhibitorName}"` };
  }

  const favorites = loadFavorites();
  if (favorites.find(f => normalize(f.name) === normalize(exhibitor.name))) {
    return { message: `"${exhibitor.name}" is already in your favorites.` };
  }

  favorites.push({
    name: exhibitor.name,
    stand: exhibitor.stand,
    country: exhibitor.country,
    categories: exhibitor.categories,
    profileUrl: exhibitor.profileUrl,
    addedAt: new Date().toISOString(),
  });

  saveFavorites(favorites);
  return { message: `Added "${exhibitor.name}" to favorites. You now have ${favorites.length} saved exhibitor(s).` };
}

function listFavorites() {
  const favorites = loadFavorites();
  if (favorites.length === 0) {
    return { message: 'No favorites saved yet. Use add_to_favorites to save exhibitors.' };
  }
  return favorites;
}

function searchSpeakers({ topic }) {
  const speakers = loadSpeakers();

  if (speakers.length === 0) {
    // Return known speakers from press coverage as a fallback
    const known = [
      {
        name: 'Mohamed Al Kuwaiti',
        title: 'Head of Cybersecurity, UAE Government',
        topics: ['cybersecurity', 'AI governance', 'national security'],
        organization: 'UAE Government',
      },
      {
        name: 'Divine Selase Agbeti',
        title: 'Director General',
        topics: ['cybersecurity', 'digital policy', 'Africa tech'],
        organization: 'Ghana Cyber Security Authority',
      },
      {
        name: 'Justin Williams',
        title: 'Group Chief Enterprise Business Officer',
        topics: ['telecom', 'connectivity', 'digital transformation', 'Africa'],
        organization: 'MTN Group',
      },
    ];

    if (!topic) return known;

    const t = normalize(topic);
    return known.filter(s =>
      s.topics.some(st => normalize(st).includes(t)) ||
      normalize(s.name).includes(t) ||
      normalize(s.organization).includes(t) ||
      normalize(s.title).includes(t)
    );
  }

  if (!topic) return speakers;

  const t = normalize(topic);
  return speakers.filter(s =>
    normalize(s.name).includes(t) ||
    normalize(JSON.stringify(s)).includes(t)
  );
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'GITEX Africa 2026', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_exhibitors',
      description:
        'Search GITEX Africa 2026 exhibitors by keyword, country, or sector/category. ' +
        'Returns up to 20 matching exhibitors with stand number, country, categories, and a short description.',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Free-text keyword (company name, technology, sector)' },
          country: { type: 'string', description: 'Filter by country (e.g. "Morocco", "Kenya", "France")' },
          category: { type: 'string', description: 'Filter by sector/category (e.g. "Fintech", "AI", "Cybersecurity")' },
        },
      },
    },
    {
      name: 'get_exhibitor_detail',
      description: 'Get the full profile of a specific exhibitor by name, including description, stand, categories, and profile URL.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The exhibitor company name (partial match supported)' },
        },
        required: ['name'],
      },
    },
    {
      name: 'list_categories',
      description: 'List all unique sector/category tags available at GITEX Africa 2026, sorted by how many exhibitors belong to each.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'match_by_profile',
      description:
        'Takes a free-text description of who you are and returns the most relevant exhibitors for you. ' +
        'Example: "I am a cybersecurity consultant from Morocco looking for AI-powered threat detection tools."',
      inputSchema: {
        type: 'object',
        properties: {
          userProfile: {
            type: 'string',
            description: 'Free-text description of the user\'s role, interests, and goals',
          },
        },
        required: ['userProfile'],
      },
    },
    {
      name: 'add_to_favorites',
      description: 'Save an exhibitor to your personal favorites list for later follow-up.',
      inputSchema: {
        type: 'object',
        properties: {
          exhibitorName: { type: 'string', description: 'Name of the exhibitor to save' },
        },
        required: ['exhibitorName'],
      },
    },
    {
      name: 'list_favorites',
      description: 'View all exhibitors you have saved to your favorites list.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'search_speakers',
      description: 'Search GITEX Africa 2026 conference speakers by topic, name, or organization.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic, speaker name, or organization to search for' },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'search_exhibitors':
        result = searchExhibitors(args || {});
        break;
      case 'get_exhibitor_detail':
        result = getExhibitorDetail(args || {});
        break;
      case 'list_categories':
        result = listCategories();
        break;
      case 'match_by_profile':
        result = matchByProfile(args || {});
        break;
      case 'add_to_favorites':
        result = addToFavorites(args || {});
        break;
      case 'list_favorites':
        result = listFavorites();
        break;
      case 'search_speakers':
        result = searchSpeakers(args || {});
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start — stdio locally, HTTP/SSE on Railway (when PORT is set)
// ---------------------------------------------------------------------------

async function main() {
  const PORT = process.env.PORT;

  if (PORT) {
    // HTTP mode for Railway (and any remote hosting)
    const { default: express } = await import('express');
    const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');

    const app = express();
    app.use(express.json());

    const transports = {};

    app.get('/', (_req, res) => {
      res.send('GITEX Africa 2026 MCP Server is running. Connect via /sse');
    });

    app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on('close', () => delete transports[transport.sessionId]);
      await server.connect(transport);
    });

    app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId;
      const transport = transports[sessionId];
      if (!transport) {
        res.status(400).send('Unknown sessionId');
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    app.listen(PORT, () => {
      console.log(`GITEX Africa 2026 MCP server listening on port ${PORT}. Loaded ${EXHIBITORS.length} exhibitors.`);
    });
  } else {
    // Stdio mode for local Claude Desktop
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`GITEX Africa 2026 MCP server running (stdio). Loaded ${EXHIBITORS.length} exhibitors.`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
