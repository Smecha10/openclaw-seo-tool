# OpenClaw SEO Tool

> Automated SEO keyword research + placement tool built for [OpenClaw](https://openclaw.ai). Uses AgentMail for autonomous account creation and verification, then places keyword-optimized content across high-DA forums, Reddit, Quora, and no-signup comment sections.

---

## Features

- **Keyword Research** — Scrapes Google Autocomplete, People Also Ask, and Reddit for low-competition long-tail keywords
- **AgentMail Account Creation** — Autonomously signs up and verifies accounts on Reddit, Quora, Medium, Yelp, Nextdoor using throwaway inboxes
- **Credential Vault** — Stores and reuses aged accounts for better platform trust/karma
- **Smart Comment Posting** — Generates natural, value-adding comments (not spammy) with keyword anchors
- **No-Signup Fallback** — Also posts to open forums and Disqus-enabled blogs that require no account
- **Full Orchestration** — Single prompt chains all phases together automatically

---

## Project Structure

```
openclaw-seo-tool/
├── skills/
│   ├── seo-keyword-researcher.js    # Phase 1: Keyword discovery
│   ├── seo-account-creator.js       # Phase 2: AgentMail account signup & verify
│   ├── seo-keyword-placer.js        # Phase 3: Post keyword content
│   └── seo-vault-manager.js         # Credential storage & retrieval
├── prompts/
│   └── seo-orchestrator.md          # Master orchestrator prompt
├── config/
│   └── targets.json                 # Platform targets with DA scores
├── package.json
└── README.md
```

---

## Requirements

- [OpenClaw](https://openclaw.ai) installed and running
- AgentMail skill enabled in OpenClaw
- Agent Browser skill enabled in OpenClaw
- Node.js 18+

---

## Installation

```bash
# 1. Clone this repo into your OpenClaw skills directory
git clone https://github.com/Smecha10/openclaw-seo-tool.git
cd openclaw-seo-tool

# 2. Install dependencies
npm install

# 3. Install required OpenClaw skills
openclaw skills install agent-browser agentmail

# 4. Copy skill files to OpenClaw skills directory
cp skills/*.js ~/.openclaw/skills/
```

---

## Usage

### Quick Start — Run the Full Orchestrator

Paste this prompt into your OpenClaw chat or CLI:

```
You are an SEO automation agent for a [BUSINESS TYPE] in [CITY, STATE].

WORKFLOW:
1. Use [seo-keyword-researcher] to find top 15 low-competition keywords.
2. For each keyword cluster:
   a. Use [seo-account-creator] to create/reuse accounts via AgentMail.
   b. Find 3 relevant threads per keyword on Reddit and Quora.
   c. Use [seo-keyword-placer] to post helpful comments with keyword anchors.
3. Also post to 5 no-signup comment sections.
4. Return a full placement report.

PERSONA: Friendly local homeowner with experience using local services.
TONE: Helpful, conversational, not salesy.
```

### Individual Skills

```bash
# Keyword research only
openclaw run "Use [seo-keyword-researcher] for pest control Provo Utah"

# Create a Reddit account via AgentMail
openclaw run "Use [seo-account-creator] to create a reddit account"

# Post a comment to a specific thread
openclaw run "Use [seo-keyword-placer] to post about 'pest control Provo' to reddit.com/r/provo"
```

---

## Configuration

Edit `config/targets.json` to customize platforms and targets:

```json
{
  "account_platforms": [
    { "name": "reddit",   "url": "https://reddit.com/register",   "da": 91 },
    { "name": "quora",    "url": "https://quora.com/sign-up",     "da": 93 },
    { "name": "medium",   "url": "https://medium.com/m/signin",   "da": 95 },
    { "name": "yelp",     "url": "https://biz.yelp.com/signup",   "da": 94 },
    { "name": "nextdoor", "url": "https://nextdoor.com/register", "da": 89 }
  ],
  "no_signup_targets": [
    { "name": "City-Data Utah Forum",  "url": "https://www.city-data.com/forum/utah/",     "da": 71 },
    { "name": "Houzz Discussions",    "url": "https://www.houzz.com/discussions",          "da": 90 },
    { "name": "Angi Listings",        "url": "https://www.angi.com/companylist/",          "da": 85 }
  ]
}
```

---

## How AgentMail Account Creation Works

```
1. AgentMail generates a fresh throwaway inbox address
2. Agent fills signup form with AI-generated realistic persona
3. AgentMail polls for the verification email
4. Agent extracts & visits the verification link
5. Credentials saved to OpenClaw vault for future reuse
6. On next run: vault check first → reuse aged account if exists
```

Aged accounts carry more platform authority (Reddit karma, Quora trust score), making placements more effective over time.

---

## Ethical Usage

- Always post **value-adding** content — the LLM prompt is designed to generate helpful comments, not spam
- Respect platform terms of service for your use case
- Use persona accounts responsibly and don't post misleading information
- Focus on genuinely answering questions where your business/service is relevant

---

## License

MIT
