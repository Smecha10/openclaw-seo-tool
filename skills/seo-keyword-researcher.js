/**
 * seo-keyword-researcher.js
 * OpenClaw SEO Tool - Phase 1: Keyword Discovery
 *
 * Scrapes multiple free sources to find low-competition long-tail keywords:
 *  - Google Autocomplete API
 *  - Google People Also Ask (via SERP scrape)
 *  - Reddit top posts and comments
 *  - Bing Suggestions
 *
 * Drop this file into your OpenClaw skills directory:
 *   cp skills/seo-keyword-researcher.js ~/.openclaw/skills/
 */

export default {
  name: 'seo-keyword-researcher',
  version: '1.0.0',
  description: 'Finds low-competition long-tail keywords from Google Autocomplete, PAA, Reddit, and Bing.',
  author: 'Smecha10',

  // Schema for OpenClaw skill runner
  input: {
    niche: { type: 'string', required: true, description: 'Business niche (e.g. pest control)' },
    location: { type: 'string', required: true, description: 'Target city/state (e.g. Provo Utah)' },
    limit: { type: 'number', default: 15, description: 'Max keywords to return' },
  },

  async run({ niche, location, limit = 15 }, agent) {
    agent.log(`[seo-keyword-researcher] Starting keyword research for: ${niche} in ${location}`);

    const rawKeywords = [];

    // ─── SOURCE 1: Google Autocomplete ────────────────────────────────────────
    try {
      agent.log('[seo-keyword-researcher] Fetching Google Autocomplete suggestions...');
      const seeds = [
        `${niche} ${location}`,
        `${niche} near me`,
        `best ${niche} ${location}`,
        `affordable ${niche} ${location}`,
        `${niche} company ${location}`,
      ];

      for (const seed of seeds) {
        const url = `https://suggestqueries.google.com/complete/search?output=firefox&q=${encodeURIComponent(seed)}`;
        const response = await agent.browser.fetch(url);
        const data = JSON.parse(response);
        if (data && data[1]) {
          rawKeywords.push(...data[1].map(kw => ({ keyword: kw, source: 'google_autocomplete' })));
        }
      }
    } catch (err) {
      agent.log(`[seo-keyword-researcher] Google Autocomplete error: ${err.message}`);
    }

    // ─── SOURCE 2: Bing Autocomplete ──────────────────────────────────────────
    try {
      agent.log('[seo-keyword-researcher] Fetching Bing Autocomplete suggestions...');
      const bingUrl = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(`${niche} ${location}`)}`;
      const response = await agent.browser.fetch(bingUrl);
      const data = JSON.parse(response);
      if (data && data[1]) {
        rawKeywords.push(...data[1].map(kw => ({ keyword: kw, source: 'bing_autocomplete' })));
      }
    } catch (err) {
      agent.log(`[seo-keyword-researcher] Bing Autocomplete error: ${err.message}`);
    }

    // ─── SOURCE 3: Reddit Mining ──────────────────────────────────────────────
    try {
      agent.log('[seo-keyword-researcher] Mining Reddit for keyword signals...');
      await agent.browser.navigate(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(`${niche} ${location}`)}&sort=top&limit=25`
      );
      const redditData = await agent.browser.extractJSON();

      if (redditData?.data?.children) {
        for (const post of redditData.data.children) {
          const title = post?.data?.title || '';
          rawKeywords.push({ keyword: title.toLowerCase().trim(), source: 'reddit_title' });
        }
      }
    } catch (err) {
      agent.log(`[seo-keyword-researcher] Reddit mining error: ${err.message}`);
    }

    // ─── SOURCE 4: Google People Also Ask ────────────────────────────────────
    try {
      agent.log('[seo-keyword-researcher] Scraping Google People Also Ask...');
      await agent.browser.navigate(
        `https://www.google.com/search?q=${encodeURIComponent(`${niche} ${location}`)}`
      );
      const paaQuestions = await agent.browser.extract(
        'Find all "People Also Ask" questions on this page and return them as a JSON array of strings'
      );
      if (Array.isArray(paaQuestions)) {
        rawKeywords.push(...paaQuestions.map(q => ({ keyword: q.toLowerCase().trim(), source: 'people_also_ask' })));
      }
    } catch (err) {
      agent.log(`[seo-keyword-researcher] PAA scrape error: ${err.message}`);
    }

    // ─── LLM CLUSTERING & RANKING ────────────────────────────────────────────
    agent.log(`[seo-keyword-researcher] Clustering and ranking ${rawKeywords.length} raw keywords with LLM...`);

    const clustered = await agent.llm.prompt(`
You are an SEO specialist. Below is a list of raw keyword candidates scraped from Google Autocomplete, Bing, Reddit, and People Also Ask.

Niche: ${niche}
Target Location: ${location}
Raw Keywords:
${JSON.stringify(rawKeywords.map(k => k.keyword), null, 2)}

Your task:
1. Remove duplicates and irrelevant entries
2. Cluster keywords by search intent:
   - informational (how to, what is, etc.)
   - local (near me, in [city], best [city])
   - commercial (cost, price, hire, company)
3. For each cluster, select the top keywords by estimated opportunity (low competition + decent volume)
4. Return exactly ${limit} keywords as a JSON array of objects with these fields:
   - keyword: string
   - intent: "informational" | "local" | "commercial"
   - difficulty: "low" | "medium" | "high"
   - suggested_anchor_text: a natural 3-6 word anchor text using the keyword
   - post_targets: array of 2 platform names best suited for this keyword (reddit, quora, forums, medium, nextdoor, yelp)

Return ONLY valid JSON. No explanation.
    `);

    let keywords;
    try {
      keywords = typeof clustered === 'string' ? JSON.parse(clustered) : clustered;
    } catch {
      agent.log('[seo-keyword-researcher] Failed to parse LLM output, returning raw list.');
      keywords = rawKeywords.slice(0, limit).map(k => ({
        keyword: k.keyword,
        intent: 'local',
        difficulty: 'medium',
        suggested_anchor_text: k.keyword,
        post_targets: ['reddit', 'quora'],
      }));
    }

    agent.log(`[seo-keyword-researcher] Done. Found ${keywords.length} keywords.`);
    return keywords;
  },
};
