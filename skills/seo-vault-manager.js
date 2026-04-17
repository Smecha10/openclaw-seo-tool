/**
 * seo-vault-manager.js
 * OpenClaw SEO Tool - Credential Vault Manager
 *
 * Helper skill for managing stored SEO platform credentials.
 * Lets you:
 *  - List all stored accounts
 *  - View account details
 *  - Delete specific accounts (force re-creation)
 *  - Update post counts and last-active timestamps
 *  - Export account summary for review
 *
 * Drop this file into your OpenClaw skills directory:
 *   cp skills/seo-vault-manager.js ~/.openclaw/skills/
 */

const SUPPORTED_PLATFORMS = ['reddit', 'quora', 'medium', 'yelp', 'nextdoor'];

export default {
  name: 'seo-vault-manager',
  version: '1.0.0',
  description: 'Manages stored SEO platform account credentials in the OpenClaw vault.',
  author: 'Smecha10',

  input: {
    action: {
      type: 'string',
      required: true,
      description: 'Action to perform: list | view | delete | increment-posts | export',
    },
    platform: {
      type: 'string',
      required: false,
      description: 'Platform name for view/delete/increment-posts actions',
    },
  },

  async run({ action, platform }, agent) {
    agent.log(`[seo-vault-manager] Action: ${action}${platform ? ` on ${platform}` : ''}`);

    switch (action.toLowerCase()) {

      // ─── LIST: Show all stored accounts ─────────────────────────────────
      case 'list': {
        const accounts = [];
        for (const p of SUPPORTED_PLATFORMS) {
          const data = await agent.vault.get(`seo-account-${p}`);
          if (data) {
            accounts.push({
              platform: p,
              username: data.username,
              email: data.email,
              createdAt: data.createdAt,
              postsCount: data.postsCount || 0,
              lastActive: data.lastActive || 'never',
            });
          }
        }
        agent.log(`[seo-vault-manager] Found ${accounts.length} stored accounts.`);
        return accounts;
      }

      // ─── VIEW: Show full details for one platform ────────────────────────
      case 'view': {
        if (!platform) throw new Error('platform is required for view action');
        const data = await agent.vault.get(`seo-account-${platform}`);
        if (!data) {
          return { found: false, message: `No account found for ${platform}` };
        }
        // Mask password for safety
        return { ...data, password: '***MASKED***', found: true };
      }

      // ─── DELETE: Remove an account from vault ─────────────────────────
      case 'delete': {
        if (!platform) throw new Error('platform is required for delete action');
        const existing = await agent.vault.get(`seo-account-${platform}`);
        if (!existing) {
          return { success: false, message: `No account found for ${platform}` };
        }
        await agent.vault.delete(`seo-account-${platform}`);
        agent.log(`[seo-vault-manager] Deleted account for ${platform}: ${existing.username}`);
        return { success: true, deleted: existing.username, platform };
      }

      // ─── INCREMENT-POSTS: Update post count after posting ────────────────
      case 'increment-posts': {
        if (!platform) throw new Error('platform is required for increment-posts action');
        const data = await agent.vault.get(`seo-account-${platform}`);
        if (!data) {
          return { success: false, message: `No account found for ${platform}` };
        }
        data.postsCount = (data.postsCount || 0) + 1;
        data.lastActive = new Date().toISOString();
        await agent.vault.set(`seo-account-${platform}`, data);
        agent.log(`[seo-vault-manager] Updated ${platform} post count to ${data.postsCount}`);
        return { success: true, platform, postsCount: data.postsCount, lastActive: data.lastActive };
      }

      // ─── EXPORT: Export all accounts as summary report ──────────────────
      case 'export': {
        const report = [];
        for (const p of SUPPORTED_PLATFORMS) {
          const data = await agent.vault.get(`seo-account-${p}`);
          report.push({
            platform: p,
            hasAccount: !!data,
            username: data?.username || null,
            postsCount: data?.postsCount || 0,
            accountAge: data?.createdAt
              ? `${Math.floor((Date.now() - new Date(data.createdAt)) / (1000 * 60 * 60 * 24))} days`
              : null,
            lastActive: data?.lastActive || null,
          });
        }
        agent.log('[seo-vault-manager] Export complete.');
        return {
          generatedAt: new Date().toISOString(),
          totalAccounts: report.filter(r => r.hasAccount).length,
          accounts: report,
        };
      }

      default:
        throw new Error(`Unknown action: ${action}. Use: list | view | delete | increment-posts | export`);
    }
  },
};
