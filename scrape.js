/**
 * GITEX Africa 2026 Exhibitor Scraper
 * Fetches all exhibitors from the Xporience platform and saves to exhibitors.json
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://exhibitors.gitexafrica.com/gitex-africa-2026/Exhibitor/fetchExhibitors';
const LIMIT = 50;

async function fetchPage(start) {
  const params = new URLSearchParams({
    limit: LIMIT,
    start,
    keyword_search: '',
    cuntryId: '',
    InitialKey: '',
    start_up_exhibitors: '',
    type: '',
  });

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://exhibitors.gitexafrica.com/gitex-africa-2026/Exhibitor',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} at start=${start}`);
  return res.text();
}

function parseExhibitors(html) {
  const $ = cheerio.load(html);
  const exhibitors = [];

  $('.item.list-group-item').each((_, el) => {
    const $el = $(el);

    const name = $el.find('h4.heading').text().trim();
    if (!name) return;

    // Stand info is in the first <p> inside .web
    const standText = $el.find('.web p').first().text().trim();
    const stand = standText.replace('Stand No-', '').trim();

    // Country is in a span with font-weight:600
    const country = $el.find('.web p span[style*="font-weight:600"]').text().trim();

    // Description
    const description = $el.find('p.list-group-item-text span').text().trim();

    // Categories
    const categories = [];
    $el.find('ul.sector_block li').each((_, li) => {
      const t = $(li).text().trim();
      if (t) categories.push(t);
    });

    const profileUrl = $el.find('a[href*="ExbDetails"]').attr('href') || '';
    const mapUrl = $el.find('a[href*="map.gitexafrica.com"]').attr('href') || '';

    exhibitors.push({ name, stand, country, description, categories, profileUrl, mapUrl });
  });

  return exhibitors;
}

async function scrapeAll() {
  console.log('Starting GITEX Africa 2026 exhibitor scrape...');
  const all = [];
  let start = 0;
  let hasMore = true;

  while (hasMore) {
    process.stdout.write(`  Fetching start=${start}... `);
    try {
      const html = await fetchPage(start);
      const batch = parseExhibitors(html);

      if (batch.length === 0) {
        console.log('empty — done.');
        hasMore = false;
      } else {
        console.log(`got ${batch.length} exhibitors.`);
        all.push(...batch);
        start += LIMIT;
        if (batch.length < LIMIT) hasMore = false;
      }
    } catch (err) {
      console.error(`\nError at start=${start}:`, err.message);
      hasMore = false;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nTotal exhibitors scraped: ${all.length}`);

  // Deduplicate by name
  const seen = new Set();
  const unique = all.filter(e => {
    if (seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });

  if (unique.length !== all.length) {
    console.log(`After dedup: ${unique.length} exhibitors`);
  }

  writeFileSync('exhibitors.json', JSON.stringify(unique, null, 2));
  console.log('Saved to exhibitors.json');

  const countries = [...new Set(unique.map(e => e.country).filter(Boolean))];
  const categories = [...new Set(unique.flatMap(e => e.categories).filter(Boolean))];
  console.log(`Countries: ${countries.length}, Categories: ${categories.length}`);

  return unique;
}

scrapeAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
