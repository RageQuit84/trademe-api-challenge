import type { WatchlistFilter } from './clients/WatchlistClient';

/**
 * Single source of truth for watchlist endpoint paths, relative to the API base
 * URL. Shared by the WatchlistClient and the live auth/negative tests so the
 * two cannot drift apart.
 *
 * The mixed casing is intentional and mirrors the Trade Me API exactly:
 *   - add      -> `watchList`
 *   - remove   -> `WatchList`
 *   - retrieve -> `watchlist`
 * Centralising it here documents that quirk in one place instead of repeating
 * (and risking inconsistent) literals across the suite.
 *
 * NOTE: the Pact contract spec intentionally does NOT use these builders — its
 * paths are stated as literals so the contract independently pins the expected
 * URL rather than echoing the code under test.
 */
export const watchlistEndpoints = {
  add: (listingId: number): string => `mytrademe/watchList/${listingId}.json`,
  remove: (listingId: number): string => `mytrademe/WatchList/${listingId}.json`,
  retrieve: (filter: WatchlistFilter): string => `mytrademe/watchlist/${filter}.json`,
} as const;
