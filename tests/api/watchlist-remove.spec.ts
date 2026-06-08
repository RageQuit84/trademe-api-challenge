import { test, expect } from '../../src/fixtures/api.fixture';
import { WatchListResponseSchema, WatchlistSchema } from '../../src/api/schemas/watchlist.schema';

/**
 * AC2 — A user should be able to remove items from their watchlist.
 */
test.describe('AC2: remove a listing from the watchlist', () => {
  test('removes a previously added listing', async ({ watchlist, search }) => {
    const listingId = await search.findOpenListing();

    // Arrange: ensure the listing is on the watchlist.
    const addResponse = await watchlist.add(listingId);
    expect(addResponse.ok()).toBeTruthy();

    // Act: remove it.
    const removeResponse = await watchlist.remove(listingId);
    expect(removeResponse.ok()).toBeTruthy();
    const body = WatchListResponseSchema.parse(await removeResponse.json());
    expect(body.Success).toBe(true);

    // Assert: it is no longer present.
    const listResponse = await watchlist.retrieve('All', { rows: 50 });
    const watchlistBody = WatchlistSchema.parse(await listResponse.json());
    const ids = watchlistBody.List.map((item) => item.ListingId);
    expect(ids).not.toContain(listingId);
  });

  test('removing a listing that is not on the watchlist does not error', async ({ watchlist }) => {
    // Per the API docs, removing an auction that doesn't exist or isn't on the
    // watchlist does not produce an error.
    const nonExistentListingId = 1;

    const response = await watchlist.remove(nonExistentListingId);
    expect(response.ok()).toBeTruthy();
    // Body still parses as a WatchListResponse.
    WatchListResponseSchema.parse(await response.json());
  });
});
