import * as path from 'path';
import { test, expect, request } from '@playwright/test';
import { Pact, Matchers, SpecificationVersion, type LogLevel } from '@pact-foundation/pact';
import { OAuthPlaintext } from '../../src/core/auth/OAuthPlaintext';
import { WatchlistClient } from '../../src/api/clients/WatchlistClient';
import {
  WatchListResponseSchema,
  WatchlistSchema,
} from '../../src/api/schemas/watchlist.schema';

/**
 * Consumer-driven contract tests (showcase layer).
 *
 * These do NOT hit the live sandbox. Pact stands up a mock provider, our real
 * WatchlistClient is run against it, and the agreed interactions are written to
 * a pact file under ./pacts. That file is the contract a provider would later
 * verify against. This demonstrates the technique as an additional safety layer
 * on top of the live API regression tests.
 *
 * Uses the Pact-JS v4 DSL (`Pact` + `Matchers` + builder callbacks), per
 * https://github.com/pact-foundation/pact-js/blob/master/examples/http/consumer.test.ts
 *
 * Credentials here are dummies — no network call leaves the mock provider — so
 * this layer runs without real secrets (handy in CI / forks).
 */
const { integer, string, eachLike, like } = Matchers;

const LISTING_ID = 1234;

const dummyAuth = new OAuthPlaintext({
  consumerKey: 'TEST_CONSUMER_KEY',
  consumerSecret: 'TEST_CONSUMER_SECRET',
  token: 'TEST_TOKEN',
  tokenSecret: 'TEST_TOKEN_SECRET',
});

// The consumer always sends this exact PLAINTEXT header. (Pact splits header
// values on commas, so a single whole-string regex matcher doesn't apply
// cleanly to an OAuth header — an exact expectation is both simpler and
// deterministic for a fixed-credential consumer contract.)
const oauthHeader = dummyAuth.buildHeaderValue();

function newPact(): Pact {
  return new Pact({
    consumer: 'WatchlistConsumer',
    provider: 'TradeMeWatchlistApi',
    spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: (process.env.LOG_LEVEL as LogLevel) ?? 'warn',
  });
}

test.describe('Watchlist consumer contract', () => {
  test('POST add a listing to the watchlist', async () => {
    await newPact()
      .addInteraction()
      .given('the user is authenticated and listing 1234 is open')
      .uponReceiving('a request to add listing 1234 to the watchlist')
      .withRequest('POST', `/mytrademe/watchList/${LISTING_ID}.json`, (builder) => {
        builder.headers({ Authorization: oauthHeader });
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' });
        builder.jsonBody({ Success: like(true), Description: null });
      })
      .executeTest(async (mockServer) => {
        const ctx = await request.newContext({ baseURL: mockServer.url });
        const client = new WatchlistClient(ctx, dummyAuth);

        const response = await client.add(LISTING_ID);
        expect(response.ok()).toBeTruthy();
        const body = WatchListResponseSchema.parse(await response.json());
        expect(body.Success).toBe(true);

        await ctx.dispose();
      });
  });

  test('DELETE remove a listing from the watchlist', async () => {
    await newPact()
      .addInteraction()
      .given('the user is authenticated and listing 1234 is on the watchlist')
      .uponReceiving('a request to remove listing 1234 from the watchlist')
      .withRequest('DELETE', `/mytrademe/WatchList/${LISTING_ID}.json`, (builder) => {
        builder.headers({ Authorization: oauthHeader });
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' });
        builder.jsonBody({ Success: like(true), Description: null });
      })
      .executeTest(async (mockServer) => {
        const ctx = await request.newContext({ baseURL: mockServer.url });
        const client = new WatchlistClient(ctx, dummyAuth);

        const response = await client.remove(LISTING_ID);
        expect(response.ok()).toBeTruthy();
        const body = WatchListResponseSchema.parse(await response.json());
        expect(body.Success).toBe(true);

        await ctx.dispose();
      });
  });

  test('GET retrieve the watchlist', async () => {
    await newPact()
      .addInteraction()
      .given('the user is authenticated and has at least one watchlist item')
      .uponReceiving('a request to retrieve the All watchlist')
      .withRequest('GET', '/mytrademe/watchlist/All.json', (builder) => {
        builder.headers({ Authorization: oauthHeader });
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' });
        builder.jsonBody({
          TotalCount: integer(1),
          Page: integer(1),
          PageSize: integer(50),
          List: eachLike({
            ListingId: integer(LISTING_ID),
            Title: string('Example listing'),
          }),
        });
      })
      .executeTest(async (mockServer) => {
        const ctx = await request.newContext({ baseURL: mockServer.url });
        const client = new WatchlistClient(ctx, dummyAuth);

        const response = await client.retrieve('All');
        expect(response.ok()).toBeTruthy();
        const body = WatchlistSchema.parse(await response.json());
        expect(body.List[0].ListingId).toBe(LISTING_ID);

        await ctx.dispose();
      });
  });
});
