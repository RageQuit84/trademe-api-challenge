import type { APIRequestContext, APIResponse } from '@playwright/test';
import { OAuthPlaintext } from '../../core/auth/OAuthPlaintext';
import { watchlistEndpoints } from '../endpoints';

/**
 * Optional query parameters for retrieving the watchlist.
 * https://developer.trademe.co.nz/api-reference/my-trade-me-methods/retrieve-your-watchlist/
 */
export interface WatchlistQuery {
  category?: string;
  category_ids?: string;
  page?: number;
  rows?: number;
  photo_size?: 'Thumbnail' | 'List' | 'Medium' | 'Gallery' | 'Large' | 'FullSize';
}

/** The documented watchlist filter segments. */
export type WatchlistFilter =
  | 'All'
  | 'ClosingToday'
  | 'LeadingBids'
  | 'ReserveMet'
  | 'ReserveNotMet'
  | 'OpenHomes';

/**
 * Thin wrapper over Playwright's APIRequestContext for the watchlist endpoints.
 * The base URL is bound to the request context (set per Playwright project, or
 * to the Pact mock server in contract tests), so paths here are relative.
 */
export class WatchlistClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly auth: OAuthPlaintext,
  ) {}

  /** AC1 — add a listing to the watchlist. */
  async add(listingId: number): Promise<APIResponse> {
    return this.request.post(watchlistEndpoints.add(listingId), {
      headers: this.auth.buildHeaders(),
    });
  }

  /** AC2 — remove a listing from the watchlist. */
  async remove(listingId: number): Promise<APIResponse> {
    return this.request.delete(watchlistEndpoints.remove(listingId), {
      headers: this.auth.buildHeaders(),
    });
  }

  /** AC3/AC4 — retrieve the (authenticated user's own) watchlist, optionally filtered. */
  async retrieve(
    filter: WatchlistFilter = 'All',
    query: WatchlistQuery = {},
  ): Promise<APIResponse> {
    return this.request.get(watchlistEndpoints.retrieve(filter), {
      headers: this.auth.buildHeaders(),
      params: toParams(query),
    });
  }
}

function toParams(query: WatchlistQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params[key] = value;
    }
  }
  return params;
}
