import type { APIRequestContext } from '@playwright/test';
import { OAuthPlaintext } from '../../core/auth/OAuthPlaintext';
import { SearchResultSchema } from '../schemas/watchlist.schema';

/**
 * Wrapper over the general search endpoint, used to discover a live, currently
 * open listing so watchlist add/remove tests aren't pinned to a hard-coded ID
 * that will eventually close.
 * https://developer.trademe.co.nz/api-reference/search-methods/general-search/
 */
export class SearchClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly auth: OAuthPlaintext,
  ) {}

  /**
   * Returns the ListingId of a currently open listing.
   * @param rows how many results to fetch (the first is used).
   */
  async findOpenListing(rows = 20): Promise<number> {
    const [id] = await this.findOpenListings(1, rows);
    return id;
  }

  /**
   * Returns `count` distinct open ListingIds, for tests that need more than one
   * piece of test data (e.g. seeding a multi-item watchlist to exercise paging).
   * @param count how many distinct listings to return.
   * @param rows how many search results to fetch (must be >= count).
   */
  async findOpenListings(count: number, rows = 20): Promise<number[]> {
    const response = await this.request.get('Search/General.json', {
      headers: this.auth.buildHeaders(),
      params: { rows: Math.max(rows, count), page: 1 },
    });

    if (!response.ok()) {
      throw new Error(
        `Search/General returned ${response.status()} ${response.statusText()} ` +
          `while looking for test listings.`,
      );
    }

    const result = SearchResultSchema.parse(await response.json());
    const ids = [...new Set(result.List.map((item) => item.ListingId))];
    if (ids.length < count) {
      throw new Error(
        `Search/General returned only ${ids.length} distinct open listing(s); needed ${count}.`,
      );
    }

    return ids.slice(0, count);
  }
}
