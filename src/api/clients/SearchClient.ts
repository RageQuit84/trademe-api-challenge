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
    const response = await this.request.get('Search/General.json', {
      headers: this.auth.buildHeaders(),
      params: { rows, page: 1 },
    });

    if (!response.ok()) {
      throw new Error(
        `Search/General returned ${response.status()} ${response.statusText()} ` +
          `while looking for a test listing.`,
      );
    }

    const result = SearchResultSchema.parse(await response.json());
    if (result.List.length === 0) {
      throw new Error('Search/General returned no open listings to use as test data.');
    }

    return result.List[0].ListingId;
  }
}
