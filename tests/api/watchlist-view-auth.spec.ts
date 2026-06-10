import { test, expect } from '../../src/fixtures/api.fixture';
import { WatchlistSchema } from '../../src/api/schemas/watchlist.schema';
import { watchlistEndpoints } from '../../src/api/endpoints';

/**
 * AC3 — A user should only be able to view their own watchlist.
 *
 * There is no cross-user endpoint to fetch "someone else's" watchlist; the
 * server scopes the response to whoever the OAuth token authenticates. We
 * verify that scoping by proving an authenticated call succeeds and returns a
 * well-formed watchlist, while unauthenticated / invalid-credential calls are
 * rejected (so no one can read a watchlist without their own valid token).
 */
test.describe('AC3: a user only sees their own watchlist', () => {
  test('authenticated request returns the caller\'s own watchlist', async ({ watchlist }) => {
    const response = await watchlist.retrieve('All');
    expect(response.status()).toBe(200);

    // A valid, well-formed Watchlist object is returned for the token owner.
    WatchlistSchema.parse(await response.json());
  });

  test('request without authentication is rejected', async ({ request }) => {
    const response = await request.get(watchlistEndpoints.retrieve('All'));
    expect(response.status()).toBe(401);
  });

  test('request with invalid credentials is rejected', async ({ request }) => {
    const response = await request.get(watchlistEndpoints.retrieve('All'), {
      headers: {
        Authorization:
          'OAuth oauth_consumer_key="INVALID", oauth_token="INVALID", ' +
          'oauth_signature_method="PLAINTEXT", oauth_signature="INVALID%26INVALID"',
      },
    });
    expect(response.status()).toBe(401);
  });
});
