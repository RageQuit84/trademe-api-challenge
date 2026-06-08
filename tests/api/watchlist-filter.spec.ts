import { test, expect } from '../../src/fixtures/api.fixture';
import { WatchlistSchema } from '../../src/api/schemas/watchlist.schema';
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
});
