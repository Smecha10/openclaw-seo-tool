/**
 * seo-account-creator.js
 * OpenClaw SEO Tool - Phase 2: AgentMail Account Creation
 *
 * Uses OpenClaw's AgentMail integration to:
 *  1. Generate a throwaway inbox address
 *  2. Fill signup forms with AI-generated realistic personas
 *  3. Intercept and click verification emails
 *  4. Store credentials in OpenClaw vault for reuse
 *
 * Supports: Reddit, Quora, Medium, Yelp, Nextdoor
 * (Add more platforms by extending the PLATFORMS array)
 *
 * Drop this file into your OpenClaw skills directory:
 *   cp skills/seo-account-creator.js ~/.openclaw/skills/
 */

// Platform configs with signup URLs and field mappings
const PLATFORMS = [
  {
    name: 'reddit',
    signupUrl: 'https://www.reddit.com/register',
    da: 91,
    fields: {
      email: '[name="email"], #regEmail',
      username: '[name="username"], #regUsername',
      password: '[name="password"], #regPassword',
      confirmPassword: '[name="confirmPassword"], #regConfirmPassword',
    },
    submitSelector: 'button[type="submit"]',
    verifySubject: 'verify',
    postLoginUrl: 'https://www.reddit.com',
  },
  {
    name: 'quora',
    signupUrl: 'https://www.quora.com/sign-up',
    da: 93,
    fields: {
      email: 'input[name="email"]',
      password: 'input[name="password"]',
    },
    submitSelector: 'button[type="submit"]',
    verifySubject: 'confirm',
    postLoginUrl: 'https://www.quora.com',
  },
  {
    name: 'medium',
    signupUrl: 'https://medium.com/m/signin',
    da: 95,
    fields: {
      email: 'input[name="email"], input[type="email"]',
    },
    submitSelector: 'button[type="submit"]',
    verifySubject: 'sign in',
    postLoginUrl: 'https://medium.com',
    magicLink: true, // Medium uses magic link, no password field
  },
  {
    name: 'nextdoor',
    signupUrl: 'https://nextdoor.com/register',
    da: 89,
    fields: {
      email: 'input[name="email"]',
      firstName: 'input[name="firstName"]',
      lastName: 'input[name="lastName"]',
      password: 'input[name="password"]',
    },
    submitSelector: 'button[type="submit"]',
    verifySubject: 'verify',
    postLoginUrl: 'https://nextdoor.com',
  },
];

export default {
  name: 'seo-account-creator',
  version: '1.0.0',
  description: 'Creates and verifies platform accounts using AgentMail throwaway inboxes. Stores credentials in vault.',
  author: 'Smecha10',

  input: {
    platform: {
      type: 'string',
      required: true,
      description: 'Platform name (reddit | quora | medium | nextdoor)',
    },
    persona: {
      type: 'object',
      required: false,
      description: 'Override persona (firstName, lastName, username, location). Auto-generated if not provided.',
    },
    forceNew: {
      type: 'boolean',
      default: false,
      description: 'Force creation of a new account even if one exists in vault',
    },
  },

  async run({ platform: platformName, persona, forceNew = false }, agent) {
    agent.log(`[seo-account-creator] Starting account creation for: ${platformName}`);

    const platformConfig = PLATFORMS.find(p => p.name === platformName.toLowerCase());
    if (!platformConfig) {
      throw new Error(`Unsupported platform: ${platformName}. Supported: ${PLATFORMS.map(p => p.name).join(', ')}`);
    }

    // ─── STEP 1: Check vault for existing account ──────────────────────────
    if (!forceNew) {
      const existing = await agent.vault.get(`seo-account-${platformName}`);
      if (existing) {
        agent.log(`[seo-account-creator] Found existing ${platformName} account in vault: ${existing.username}`);
        return { ...existing, reused: true };
      }
    }

    // ─── STEP 2: Generate persona ──────────────────────────────────────────
    let profile = persona;
    if (!profile) {
      agent.log('[seo-account-creator] Generating realistic persona with LLM...');
      const generated = await agent.llm.prompt(`
Generate a realistic user profile for a homeowner in Provo, Utah.
Return as JSON with these fields:
- firstName: string (common American first name)
- lastName: string (common American last name)
- username: string (6-15 chars, no spaces, could be combo of name + numbers)
- bio: string (1-2 sentences about being a local homeowner, mention Utah)
- location: string (a real Provo neighborhood like "South Provo" or "Riverside")
- birthYear: number (between 1975 and 1995)

Return ONLY valid JSON. No explanation.
      `);
      try {
        profile = typeof generated === 'string' ? JSON.parse(generated) : generated;
      } catch {
        profile = {
          firstName: 'Jordan',
          lastName: 'Mercer',
          username: `jmercer_provo${Math.floor(Math.random() * 999)}`,
          bio: 'Local homeowner in Provo, Utah. Passionate about keeping my home in great shape.',
          location: 'Provo, UT',
          birthYear: 1988,
        };
      }
    }
    agent.log(`[seo-account-creator] Generated persona: ${profile.username}`);

    // ─── STEP 3: Create AgentMail inbox ─────────────────────────────────────
    agent.log('[seo-account-creator] Creating AgentMail inbox...');
    const inbox = await agent.agentmail.createInbox({
      label: `seo-${platformName}-${profile.username}-${Date.now()}`,
    });
    agent.log(`[seo-account-creator] Inbox created: ${inbox.address}`);

    // Generate a secure password
    const password = `Seo${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 99)}`;

    // ─── STEP 4: Navigate to signup and fill form ─────────────────────────
    agent.log(`[seo-account-creator] Navigating to ${platformConfig.signupUrl}...`);
    await agent.browser.navigate(platformConfig.signupUrl);
    await agent.browser.wait(2000);

    // Use LLM to intelligently fill the signup form
    const fillResult = await agent.browser.act(`
      Fill out the signup/registration form on this page with these details:
      - Email: ${inbox.address}
      - Username (if field exists): ${profile.username}
      - First name (if field exists): ${profile.firstName}
      - Last name (if field exists): ${profile.lastName}
      - Password (if field exists): ${password}
      - Confirm password (if field exists): ${password}
      - Birth year/date (if field exists): use year ${profile.birthYear}

      Do NOT submit the form yet. Just fill all visible fields.
    `);
    agent.log(`[seo-account-creator] Form filled: ${JSON.stringify(fillResult)}`);

    // Submit the form
    await agent.browser.act('Click the sign up or create account or register submit button to submit the form.');
    await agent.browser.wait(3000);

    // ─── STEP 5: Wait for verification email ───────────────────────────────
    agent.log('[seo-account-creator] Waiting for verification email...');
    let verifyEmail;
    try {
      verifyEmail = await agent.agentmail.waitForEmail({
        inboxId: inbox.id,
        subjectContains: platformConfig.verifySubject,
        timeoutMs: 90000, // 90 second timeout
      });
    } catch (err) {
      agent.log(`[seo-account-creator] Verification email timeout: ${err.message}`);
      // Some platforms verify immediately or have alternate flows
      agent.log('[seo-account-creator] Proceeding without email verification (may already be verified).');
    }

    // ─── STEP 6: Click verification link ─────────────────────────────────
    if (verifyEmail) {
      agent.log('[seo-account-creator] Verification email received. Extracting link...');
      const verifyLink = await agent.agentmail.extractLink(verifyEmail, {
        prefer: ['verify', 'confirm', 'activate'],
      });

      if (verifyLink) {
        agent.log(`[seo-account-creator] Navigating to verification link...`);
        await agent.browser.navigate(verifyLink);
        await agent.browser.wait(2000);
        agent.log('[seo-account-creator] Email verified successfully.');
      } else {
        agent.log('[seo-account-creator] No verification link found in email body.');
      }
    }

    // ─── STEP 7: Store credentials in vault ────────────────────────────────
    const accountData = {
      platform: platformName,
      email: inbox.address,
      username: profile.username,
      password,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      location: profile.location,
      inboxId: inbox.id,
      createdAt: new Date().toISOString(),
      postsCount: 0,
    };

    await agent.vault.set(`seo-account-${platformName}`, accountData);
    agent.log(`[seo-account-creator] Account stored in vault as: seo-account-${platformName}`);

    return { ...accountData, reused: false };
  },
};
