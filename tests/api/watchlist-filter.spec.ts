import { test, expect } from '../../src/fixtures/api.fixture';
import { WatchListResponseSchema, WatchlistSchema } from '../../src/api/schemas/watchlist.schema';
import type { WatchlistFilter } from '../../src/api/clients/WatchlistClient';

/**
 * AC4 — A user should be able to filter their watchlist by different criteria.
 *
 * The filter is the {filter} path segment; paging/category are query params.
 * https://developer.trademe.co.nz/api-reference/my-trade-me-methods/retrieve-your-watchlist/
 */
test.describe('AC4: filter the watchlist by different criteria', () => {
  const filters: WatchlistFilter[] = [
    'All',
    'ClosingToday',
    'LeadingBids',
    'ReserveMet',
    'ReserveNotMet',
    'OpenHomes',
  ];

  for (const filter of filters) {
    test(`returns a valid watchlist for filter "${filter}"`, async ({ watchlist }) => {
      const response = await watchlist.retrieve(filter);
      expect(response.status()).toBe(200);
      WatchlistSchema.parse(await response.json());
    });
  }

  test('respects the rows paging parameter', async ({ watchlist }) => {
    const rows = 5;
    const response = await watchlist.retrieve('All', { rows, page: 1 });
    expect(response.status()).toBe(200);

    const body = WatchlistSchema.parse(await response.json());
    expect(body.Page).toBe(1);
    // The server should never return more items than the requested page size.
    expect(body.List.length).toBeLessThanOrEqual(rows);
  });

  test('paginates: page 2 advances to a different item', async ({ watchlist, search }) => {
    // Seed two distinct listings so more than one page exists at rows=1. (Filter
    // and paging *semantics* really belong in an integration test against a
    // seeded instance; this is the black-box equivalent we can run here.)
    const ids = await search.findOpenListings(2);
    const added: number[] = [];

    try {
      for (const id of ids) {
        const addBody = WatchListResponseSchema.parse(await (await watchlist.add(id)).json());
        expect(addBody.Success).toBe(true);
        added.push(id);
      }

      const page1 = WatchlistSchema.parse(
        await (await watchlist.retrieve('All', { rows: 1, page: 1 })).json(),
      );
      const page2 = WatchlistSchema.parse(
        await (await watchlist.retrieve('All', { rows: 1, page: 2 })).json(),
      );

      // Page index increments and the server reports more items exist than fit
      // on a single page.
      expect(page1.Page).toBe(1);
      expect(page2.Page).toBe(2);
      expect(page1.List).toHaveLength(1);
      expect(page2.List).toHaveLength(1);
      expect(page1.TotalCount).toBeGreaterThanOrEqual(2);

      // The decisive check: page 2 is a DIFFERENT item, proving paging advances
      // rather than repeating page 1. (A length<=rows check alone would pass
      // even if every page returned the same row.)
      expect(page2.List[0].ListingId).not.toBe(page1.List[0].ListingId);
    } finally {
      // Self-clean regardless of assertion outcome.
      for (const id of added) {
        await watchlist.remove(id);
      }
    }
  });
});
