# SEO Orchestrator Prompt

Copy and paste this prompt into your OpenClaw chat to run the full SEO automation pipeline.
Customize the variables in the `[CONFIGURATION]` section before running.

---

## Full Pipeline Prompt

```
You are an SEO automation agent. Your goal is to improve local search rankings by placing
helpful, keyword-optimized content across high-authority platforms.

[CONFIGURATION]
- Business type: pest control
- Target city: Provo, Utah
- Surrounding cities: Orem, Spanish Fork, Springville, Payson
- Keyword limit: 15
- Posts per keyword: 2
- Account platforms: reddit, quora
- Include no-signup: yes

[WORKFLOW - Execute in order]

STEP 1 - KEYWORD RESEARCH:
Use [seo-keyword-researcher] with:
- niche: "pest control"
- location: "Provo Utah"
- limit: 15

Save the returned keyword list. You will use it in Step 3.

STEP 2 - ACCOUNT SETUP:
For each platform in [reddit, quora]:
  a. Use [seo-vault-manager] with action: "list" to check for existing accounts.
  b. If no account exists for that platform, use [seo-account-creator] with:
     - platform: [platform name]
     - forceNew: false
  c. Log whether account was created fresh or reused from vault.

STEP 3 - KEYWORD PLACEMENT:
For each keyword from Step 1 (prioritize "low" difficulty keywords first):
  a. Use [seo-keyword-placer] with:
     - keyword: [keyword from Step 1]
     - anchorText: [suggested_anchor_text from Step 1]
     - niche: "pest control"
     - location: "Provo, Utah"
     - platforms: ["reddit", "quora", "no-signup"]
     - maxPosts: 2
  b. After successful post, use [seo-vault-manager] with:
     - action: "increment-posts"
     - platform: [platform used]
  c. Wait 5 seconds between each keyword to avoid rate limiting.

STEP 4 - FINAL REPORT:
After all keywords are processed:
  a. Use [seo-vault-manager] with action: "export" to get account summary.
  b. Compile a placement report table with columns:
     | Keyword | Intent | Platform | Thread/Post Title | Status |
  c. Show totals: keywords processed, posts placed, platforms used.
  d. Flag any keywords where placement failed and suggest manual alternatives.

[TONE & PERSONA RULES]
- All comments must sound like a genuine local homeowner in Provo, Utah
- Focus on being helpful first, promotional never
- One subtle mention of keyword anchor text per comment maximum
- Never post the same comment twice
- Skip any thread where posting would violate community rules
```

---

## Quick Single-Keyword Test Prompt

Use this to test a single keyword before running the full pipeline:

```
Test the SEO keyword placer for one keyword:

1. Use [seo-account-creator] with platform: "reddit" to ensure an account exists.
2. Use [seo-keyword-placer] with:
   - keyword: "pest control Provo Utah"
   - anchorText: "pest control in Provo"
   - niche: "pest control"
   - location: "Provo, Utah"
   - platforms: ["reddit"]
   - maxPosts: 1
3. Report back what thread was found and what comment was posted.
```

---

## Research-Only Prompt

Just run keyword research without posting:

```
Run keyword research only (no posting):

Use [seo-keyword-researcher] with:
- niche: "pest control"
- location: "Provo Utah"
- limit: 20

Return the full keyword list grouped by intent (informational, local, commercial).
For each keyword, show: keyword, difficulty, suggested_anchor_text, post_targets.
```

---

## Vault Status Check Prompt

```
Check the status of all stored SEO platform accounts:

Use [seo-vault-manager] with action: "export"

Show me which platforms have accounts, how many posts each account has made,
how old each account is, and which platforms still need account creation.
```

---

## Notes on Customization

- Change `niche` to match your business (e.g., "HVAC", "cleaning service", "lawn care")
- Change `location` to your target city
- Add cities to `surrounding cities` to expand coverage
- Add/remove platforms in the `platforms` array based on your targets
- Adjust `maxPosts` per keyword based on how aggressive you want to be
- The `forceNew: false` setting in account creation means it reuses existing vault accounts,
  which is preferred for building account authority over time
