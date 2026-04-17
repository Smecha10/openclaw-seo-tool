/**
 * seo-keyword-placer.js
 * OpenClaw SEO Tool - Phase 3: Keyword Placement
 *
 * Posts keyword-optimized, value-adding content to:
 *  - Reddit (with account login)
 *  - Quora (with account login)
 *  - Medium (with account login)
 *  - No-signup open forums and comment sections
 *
 * Uses LLM to generate natural, helpful comments that:
 *  - Answer real questions authentically
 *  - Naturally include keyword anchor text
 *  - Sound like a real local community member
 *  - Are NOT spammy or overly promotional
 *
 * Drop this file into your OpenClaw skills directory:
 *   cp skills/seo-keyword-placer.js ~/.openclaw/skills/
 */

// High-DA platforms that allow open comments without mandatory signup
const NO_SIGNUP_TARGETS = [
  {
    name: 'City-Data Utah Forum',
    searchUrl: 'https://www.city-data.com/forum/search.php?searchid=&do=process&query=',
    postType: 'forum',
    da: 71,
    requiresAccount: false,
  },
  {
    name: 'Houzz Discussions',
    searchUrl: 'https://www.houzz.com/discussions/search?q=',
    postType: 'comment',
    da: 90,
    requiresAccount: false,
  },
  {
    name: 'Angi (formerly Angie\'s List)',
    searchUrl: 'https://www.angi.com/articles/?q=',
    postType: 'comment',
    da: 85,
    requiresAccount: false,
  },
  {
    name: 'Bob Vila Community',
    searchUrl: 'https://www.bobvila.com/search#stq=',
    postType: 'comment',
    da: 72,
    requiresAccount: false,
  },
  {
    name: 'This Old House Community',
    searchUrl: 'https://www.thisoldhouse.com/search?q=',
    postType: 'comment',
    da: 78,
    requiresAccount: false,
  },
];

// Platforms that need account login (use vault credentials)
const ACCOUNT_PLATFORMS = {
  reddit: {
    loginUrl: 'https://www.reddit.com/login',
    searchUrl: 'https://www.reddit.com/search/?q=',
    postAction: 'comment on existing post',
  },
  quora: {
    loginUrl: 'https://www.quora.com',
    searchUrl: 'https://www.quora.com/search?q=',
    postAction: 'answer a question',
  },
  medium: {
    loginUrl: 'https://medium.com/m/signin',
    searchUrl: 'https://medium.com/search?q=',
    postAction: 'comment on an article',
  },
};

export default {
  name: 'seo-keyword-placer',
  version: '1.0.0',
  description: 'Posts keyword-optimized helpful comments to forums and platforms. Supports logged-in and no-signup modes.',
  author: 'Smecha10',

  input: {
    keyword: { type: 'string', required: true, description: 'The target keyword to place' },
    anchorText: { type: 'string', required: true, description: 'Natural anchor text to use in the comment' },
    niche: { type: 'string', required: true, description: 'Business niche (e.g. pest control)' },
    location: { type: 'string', required: true, description: 'Target location (e.g. Provo, Utah)' },
    platforms: {
      type: 'array',
      default: ['reddit', 'quora'],
      description: 'Platforms to post to (reddit | quora | medium | no-signup)',
    },
    maxPosts: { type: 'number', default: 3, description: 'Max number of places to post per keyword' },
    persona: { type: 'object', required: false, description: 'Persona to use (auto-loaded from vault if not provided)' },
  },

  async run({ keyword, anchorText, niche, location, platforms = ['reddit', 'quora'], maxPosts = 3, persona }, agent) {
    agent.log(`[seo-keyword-placer] Placing keyword: "${keyword}" across ${platforms.join(', ')}`);

    const results = [];
    let postsRemaining = maxPosts;

    // ─── ACCOUNT-BASED PLATFORMS ───────────────────────────────────────────
    for (const platformName of platforms) {
      if (postsRemaining <= 0) break;
      if (platformName === 'no-signup') continue;

      const platformConfig = ACCOUNT_PLATFORMS[platformName.toLowerCase()];
      if (!platformConfig) {
        agent.log(`[seo-keyword-placer] Unknown platform: ${platformName}, skipping.`);
        continue;
      }

      // Load account from vault
      let account = persona;
      if (!account) {
        account = await agent.vault.get(`seo-account-${platformName}`);
        if (!account) {
          agent.log(`[seo-keyword-placer] No ${platformName} account in vault. Run seo-account-creator first.`);
          continue;
        }
      }

      try {
        // Login
        agent.log(`[seo-keyword-placer] Logging into ${platformName} as ${account.username}...`);
        await agent.browser.navigate(platformConfig.loginUrl);
        await agent.browser.wait(1500);
        await agent.browser.act(`
          Log in to this platform using:
          - Email/username: ${account.email || account.username}
          - Password: ${account.password}
          Click the login/sign in button to complete login.
        `);
        await agent.browser.wait(2500);

        // Search for relevant threads/questions
        agent.log(`[seo-keyword-placer] Searching ${platformName} for threads about "${keyword}"...`);
        await agent.browser.navigate(`${platformConfig.searchUrl}${encodeURIComponent(keyword + ' ' + location)}`);
        await agent.browser.wait(2000);

        // Extract top relevant threads
        const threads = await agent.browser.extract(`
          Find the top 3 most relevant threads, posts, or questions on this page related to "${keyword}" in "${location}".
          Return as JSON array of objects with: title, url, relevanceScore (1-10).
        `);

        const parsedThreads = typeof threads === 'string' ? JSON.parse(threads) : threads;
        if (!parsedThreads || parsedThreads.length === 0) {
          agent.log(`[seo-keyword-placer] No relevant threads found on ${platformName}.`);
          continue;
        }

        // Pick the most relevant thread
        const bestThread = parsedThreads.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
        agent.log(`[seo-keyword-placer] Targeting thread: ${bestThread.title} (${bestThread.url})`);

        // Generate a natural, helpful comment
        const comment = await agent.llm.prompt(`
You are ${account.firstName}, a homeowner in ${location}.
Write a helpful, natural-sounding comment for this ${platformName} thread/question:
"${bestThread.title}"

Keyword context: ${keyword}
Anchor text to include naturally (once): "${anchorText}"

Rules:
- Sound like a real ${location} resident sharing genuine experience
- Provide actually useful information or perspective
- Mention the anchor text "${anchorText}" only ONCE in a completely natural way
- Do NOT include any URLs (we'll add the link separately if needed)
- Do NOT sound like an advertisement
- Length: 3-5 sentences
- Tone: friendly, helpful, conversational

Return ONLY the comment text. No preamble.
        `);

        // Navigate to the thread and post
        await agent.browser.navigate(bestThread.url);
        await agent.browser.wait(2000);

        await agent.browser.act(`
          Find the comment box, reply box, or answer box on this page.
          Click it to focus it.
          Type this comment: ${comment}
          Then submit/post the comment.
        `);
        await agent.browser.wait(2000);

        results.push({
          platform: platformName,
          keyword,
          thread: bestThread.title,
          url: bestThread.url,
          comment: comment.substring(0, 100) + '...',
          status: 'posted',
        });

        postsRemaining--;
        agent.log(`[seo-keyword-placer] Posted to ${platformName}: ${bestThread.title}`);

        // Polite delay between posts
        await agent.browser.wait(3000);

      } catch (err) {
        agent.log(`[seo-keyword-placer] Error posting to ${platformName}: ${err.message}`);
        results.push({
          platform: platformName,
          keyword,
          status: 'error',
          error: err.message,
        });
      }
    }

    // ─── NO-SIGNUP TARGETS ────────────────────────────────────────────────
    if (platforms.includes('no-signup') && postsRemaining > 0) {
      agent.log('[seo-keyword-placer] Attempting no-signup forum posts...');

      for (const target of NO_SIGNUP_TARGETS) {
        if (postsRemaining <= 0) break;

        try {
          agent.log(`[seo-keyword-placer] Searching ${target.name} for "${keyword}"...`);
          await agent.browser.navigate(`${target.searchUrl}${encodeURIComponent(keyword)}`);
          await agent.browser.wait(2000);

          const targetContent = await agent.browser.extract(
            `Find a relevant article, discussion, or thread about "${keyword}" on this page. Return URL and title as JSON.`
          );

          const parsed = typeof targetContent === 'string' ? JSON.parse(targetContent) : targetContent;
          if (!parsed || !parsed.url) {
            agent.log(`[seo-keyword-placer] Nothing relevant found on ${target.name}.`);
            continue;
          }

          // Generate comment for anonymous posting
          const anonComment = await agent.llm.prompt(`
Write a helpful, anonymous comment for a home services forum about "${keyword}" in ${location}.
Anchor text to include naturally: "${anchorText}"
Rules: helpful, 2-4 sentences, conversational, not promotional.
Return ONLY the comment text.
          `);

          await agent.browser.navigate(parsed.url);
          await agent.browser.wait(2000);

          const postAttempt = await agent.browser.act(`
            Look for a comment box, reply field, or guest comment section on this page.
            If found: fill it with this text and submit:
            "${anonComment}"
            If no comment box is visible, report that no comment section was found.
          `);

          results.push({
            platform: target.name,
            keyword,
            url: parsed.url,
            comment: anonComment.substring(0, 100) + '...',
            status: postAttempt ? 'posted' : 'no-comment-box',
            requiresAccount: false,
          });

          postsRemaining--;
          await agent.browser.wait(2500);

        } catch (err) {
          agent.log(`[seo-keyword-placer] Error with no-signup target ${target.name}: ${err.message}`);
        }
      }
    }

    agent.log(`[seo-keyword-placer] Done. ${results.filter(r => r.status === 'posted').length} posts placed.`);
    return results;
  },
};
