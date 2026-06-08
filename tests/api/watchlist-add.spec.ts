import { test, expect } from '../../src/fixtures/api.fixture';
import { WatchListResponseSchema, WatchlistSchema } from '../../src/api/schemas/watchlist.schema';

/**
 * AC1 — A user should be able to add a listing to their watchlist.
 *
 * Self-cleaning: every listing added here is removed in afterAll so the
 * sandbox account returns to a known state and reruns stay deterministic.
 */
test.describe('AC1: add a listing to the watchlist', () => {
  const added: number[] = [];

  test.afterAll(async ({ watchlist }) => {
    for (const id of added) {
      await watchlist.remove(id);
    }
  });

  test('adds an open listing and it appears in the watchlist', async ({ watchlist, search }) => {
    const listingId = await search.findOpenListing();

    const addResponse = await watchlist.add(listingId);
    expect(addResponse.ok()).toBeTruthy();

    const body = WatchListResponseSchema.parse(await addResponse.json());
    expect(body.Success).toBe(true);
    added.push(listingId);

    // Confirm it is now actually on the watchlist.
    const listResponse = await watchlist.retrieve('All', { rows: 50 });
    expect(listResponse.ok()).toBeTruthy();

    const watchlistBody = WatchlistSchema.parse(await listResponse.json());
    const ids = watchlistBody.List.map((item) => item.ListingId);
    expect(ids).toContain(listingId);
  });

  test('adding the same listing twice still succeeds (idempotent)', async ({ watchlist, search }) => {
    const listingId = await search.findOpenListing();

    const first = await watchlist.add(listingId);
    expect(first.ok()).toBeTruthy();
    const firstBody = WatchListResponseSchema.parse(await first.json());
    expect(firstBody.Success).toBe(true);
    added.push(listingId);

    const second = await watchlist.add(listingId);
    expect(second.ok()).toBeTruthy();
    const body = WatchListResponseSchema.parse(await second.json());
    expect(body.Success).toBe(true);
  });
});

test.describe('AC1: add — authentication required', () => {
  test('request without authentication is rejected', async ({ request }) => {
    const response = await request.post('mytrademe/watchList/1234.json');
    expect(response.status()).toBe(401);
  });

  test('request with invalid credentials is rejected', async ({ request }) => {
    const response = await request.post('mytrademe/watchList/1234.json', {
      headers: {
        Authorization:
          'OAuth oauth_consumer_key="INVALID", oauth_token="INVALID", ' +
          'oauth_signature_method="PLAINTEXT", oauth_signature="INVALID%26INVALID"',
      },
    });
    expect(response.status()).toBe(401);
  });
});
