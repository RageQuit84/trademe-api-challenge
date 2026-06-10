import { test, expect } from '../../src/fixtures/api.fixture';
import { WatchListResponseSchema, WatchlistSchema } from '../../src/api/schemas/watchlist.schema';
import { watchlistEndpoints } from '../../src/api/endpoints';

/**
 * AC2 — A user should be able to remove items from their watchlist.
 */
test.describe('AC2: remove a listing from the watchlist', () => {
  test('removes a previously added listing', async ({ watchlist, search }) => {
    const listingId = await search.findOpenListing();

    // Arrange: add the listing AND confirm it is genuinely on the watchlist
    // first. Without this precondition the final not.toContain assertion would
    // also pass if the add had silently failed (the API returns HTTP 200 with
    // Success:false on logical failure) or if the item was never there — i.e.
    // the test could go green without actually exercising removal.
    const addResponse = await watchlist.add(listingId);
    expect(addResponse.ok()).toBeTruthy();
    const addBody = WatchListResponseSchema.parse(await addResponse.json());
    expect(addBody.Success).toBe(true);

    const beforeResponse = await watchlist.retrieve('All', { rows: 50 });
    const beforeBody = WatchlistSchema.parse(await beforeResponse.json());
    expect(beforeBody.List.map((item) => item.ListingId)).toContain(listingId);

    // Act: remove it.
    const removeResponse = await watchlist.remove(listingId);
    expect(removeResponse.ok()).toBeTruthy();
    const body = WatchListResponseSchema.parse(await removeResponse.json());
    expect(body.Success).toBe(true);

    // Assert: it is no longer present (a real before/after delta).
    const afterResponse = await watchlist.retrieve('All', { rows: 50 });
    const afterBody = WatchlistSchema.parse(await afterResponse.json());
    expect(afterBody.List.map((item) => item.ListingId)).not.toContain(listingId);
  });

  test('removing a listing that is not on the watchlist does not error', async ({ watchlist }) => {
    // Per the API docs, removing an auction that doesn't exist or isn't on the
    // watchlist does not produce an error.
    const nonExistentListingId = 1;

    const response = await watchlist.remove(nonExistentListingId);
    expect(response.ok()).toBeTruthy();
    // "Will not produce an error" — so Success must be true, not merely a
    // well-formed body. Asserting Success guards against a 200-with-Success:false
    // regression that a bare parse would let through.
    const body = WatchListResponseSchema.parse(await response.json());
    expect(body.Success).toBe(true);
  });
});

test.describe('AC2: remove — authentication required', () => {
  test('request without authentication is rejected', async ({ request }) => {
    const response = await request.delete(watchlistEndpoints.remove(1234));
    expect(response.status()).toBe(401);
  });

  test('request with invalid credentials is rejected', async ({ request }) => {
    const response = await request.delete(watchlistEndpoints.remove(1234), {
      headers: {
        Authorization:
          'OAuth oauth_consumer_key="INVALID", oauth_token="INVALID", ' +
          'oauth_signature_method="PLAINTEXT", oauth_signature="INVALID%26INVALID"',
      },
    });
    expect(response.status()).toBe(401);
  });
});
