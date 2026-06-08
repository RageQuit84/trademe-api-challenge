import { test as base } from '@playwright/test';
import { OAuthPlaintext } from '../core/auth/OAuthPlaintext';
import { WatchlistClient } from '../api/clients/WatchlistClient';
import { SearchClient } from '../api/clients/SearchClient';
import { getConfig } from '../core/config/env';

/**
 * Playwright fixtures exposing ready-to-use, authenticated API clients. The
 * built-in `request` context already carries the project `baseURL`, so the
 * clients only need the OAuth header builder layered on top.
 */
interface ApiWorkerFixtures {
  auth: OAuthPlaintext;
}

interface ApiTestFixtures {
  watchlist: WatchlistClient;
  search: SearchClient;
}

export const test = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  // Worker-scoped: PLAINTEXT auth needs no network handshake, so the single
  // happy-path OAuth header is built once per worker and shared by every test.
  // Negative tests intentionally bypass this and send bad/missing headers.
  auth: [
    async ({}, use) => {
      const config = getConfig();
      await use(
        new OAuthPlaintext({
          consumerKey: config.consumerKey,
          consumerSecret: config.consumerSecret,
          token: config.token,
          tokenSecret: config.tokenSecret,
        }),
      );
    },
    { scope: 'worker' },
  ],

  watchlist: async ({ request, auth }, use) => {
    await use(new WatchlistClient(request, auth));
  },

  search: async ({ request, auth }, use) => {
    await use(new SearchClient(request, auth));
  },
});

export { expect } from '@playwright/test';
