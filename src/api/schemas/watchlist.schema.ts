import { z } from 'zod';

/**
 * Zod schemas for the Trade Me watchlist API responses. These are shared
 * between the live API regression tests (response-shape assertions) and the
 * Pact consumer contract tests (expected interaction bodies), keeping the two
 * layers honest about the same contract.
 */

/**
 * Returned by add (POST) and remove (DELETE) watchlist operations.
 * https://developer.trademe.co.nz/api-reference/my-trade-me-methods/add-a-listing-to-your-watchlist/
 */
export const WatchListResponseSchema = z.object({
  Success: z.boolean(),
  Description: z.string().nullable().optional(),
});
export type WatchListResponse = z.infer<typeof WatchListResponseSchema>;

/**
 * A single item in the watchlist. The API returns many fields; we assert on
 * the stable, documented core and allow the rest through.
 */
export const WatchlistListingSchema = z
  .object({
    ListingId: z.number(),
    Title: z.string().optional(),
    Category: z.string().optional(),
  })
  .passthrough();
export type WatchlistListing = z.infer<typeof WatchlistListingSchema>;

/**
 * Returned by GET /mytrademe/watchlist/{filter}.json
 * https://developer.trademe.co.nz/api-reference/my-trade-me-methods/retrieve-your-watchlist/
 */
export const WatchlistSchema = z
  .object({
    TotalCount: z.number(),
    Page: z.number(),
    PageSize: z.number(),
    List: z.array(WatchlistListingSchema),
  })
  .passthrough();
export type Watchlist = z.infer<typeof WatchlistSchema>;

/**
 * Minimal shape of the general search response, used to discover a live,
 * open listing for test data.
 * https://developer.trademe.co.nz/api-reference/search-methods/general-search/
 */
export const SearchResultSchema = z
  .object({
    TotalCount: z.number(),
    Page: z.number(),
    PageSize: z.number(),
    List: z.array(
      z
        .object({
          ListingId: z.number(),
          Title: z.string().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export type SearchResult = z.infer<typeof SearchResultSchema>;
