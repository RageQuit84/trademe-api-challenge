# Watchlist Regression Test Framework

This document describes what lives in the repository for testing the watchlist
acceptance criteria: the testing layers, why each one exists, and the tools and
frameworks used.

## Goal

The watchlist feature has a change shipping next sprint and needs API regression
tests in place beforehand that can run in CI. There is **no application source in
this repository** to test, so the suite runs against the deployed Trade Me
**Sandbox** environment (`https://api.tmsandbox.co.nz/v1`) directly.

## Tools & frameworks

| Tool | Role | Why |
| --- | --- | --- |
| [TypeScript](https://www.typescriptlang.org/) | Language | Static types catch contract drift (request/response shapes) at author time. |
| [Playwright Test](https://playwright.dev/docs/test-api-testing) | Test runner + HTTP client | First-class [API testing](https://playwright.dev/docs/api-testing) via `APIRequestContext`, plus fixtures, parallelism control, retries, tracing and HTML reports out of the box. |
| [Zod](https://zod.dev/) | Runtime schema validation | Asserts live API responses match the documented contract, not just HTTP status. Schemas are shared between the API and contract layers so both stay honest about the same shape. |
| [Pact](https://docs.pact.io/) (`@pact-foundation/pact`) | Consumer-driven contract testing | Captures the consumer's expectations of the watchlist API as a verifiable contract, independent of the live environment. |
| [dotenv](https://github.com/motdotla/dotenv) | Config / secrets loading | Keeps credentials out of source; loaded once and validated at startup. |
| [GitHub Actions](https://docs.github.com/actions) | CI | Runs the contract and API layers on every push/PR. |

## Testing layers

The suite is built in two layers. Each answers a different question.

### 1. API regression tests (primary) — `tests/api/`

**What:** Drives the live sandbox API through the watchlist endpoints and
asserts both HTTP status and response shape (via Zod).

**Why it exists:** This is the actual deliverable — regression coverage of the
shipped watchlist behaviour against the real, deployed environment. It is the
layer that would catch a regression introduced by next sprint's change. Because
there is no local application code, the live API *is* the system under test.

**How it stays reliable:**
- **Dynamic test data** — add/remove tests discover a currently-open listing via
  the Search API at runtime, so they don't break when a hard-coded listing
  closes on the shared sandbox.
- **Self-cleaning** — anything added to the watchlist is removed afterward,
  keeping reruns deterministic.

### 2. Consumer contract tests (showcase) — `tests/contract/`

**What:** A [Pact](https://docs.pact.io/) consumer test stands up a mock
provider, runs the *real* `WatchlistClient` against it, and writes a pact file
to `pacts/` describing the agreed request/response interactions.

**Why it exists:** It demonstrates contract testing as an additional safety
layer. Where the API layer verifies the *current* deployed behaviour, a contract
decouples the consumer's expectations from the environment: it runs without
network or secrets (fast, deterministic, CI-and-fork friendly), and the
generated pact is the artifact a provider could later verify against to catch
breaking changes *before* they deploy. Here it is a proof-of-concept of that
workflow rather than a wired-up broker.

## Acceptance criteria coverage

| # | Criterion | Endpoint | Spec |
| --- | --- | --- | --- |
| 1 | Add a listing to the watchlist | `POST /mytrademe/watchList/{id}.json` | `tests/api/watchlist-add.spec.ts` |
| 2 | Remove items from the watchlist | `DELETE /mytrademe/WatchList/{id}.json` | `tests/api/watchlist-remove.spec.ts` |
| 3 | View only your own watchlist | `GET /mytrademe/watchlist/{filter}.json` (auth scoping) | `tests/api/watchlist-view-auth.spec.ts` |
| 4 | Filter by different criteria | `GET /mytrademe/watchlist/{filter}.json` + query params | `tests/api/watchlist-filter.spec.ts` |

AC3 has no cross-user endpoint, so "only your own" is verified at the boundary:
an authenticated call returns a well-formed watchlist, while missing or invalid
credentials are rejected with `401` — i.e. no one reads a watchlist without
their own valid token.

## Authentication

The sandbox uses **OAuth 1.0 with PLAINTEXT signing**. PLAINTEXT is stateless:
there is no nonce, timestamp, or token-exchange handshake. Because we already
hold an access token, the `Authorization` header is a pure function of the static
credentials, where the signature is simply `consumerSecret&tokenSecret`:

```
Authorization: OAuth oauth_consumer_key="...", oauth_token="...",
               oauth_signature_method="PLAINTEXT", oauth_signature="...%26..."
```

`src/core/auth/OAuthPlaintext.ts` builds this header and memoizes it. The header
is created **once per worker** (the `auth` fixture is worker-scoped) and reused by
every happy-path test, while the negative tests intentionally bypass it and send
bad/missing headers. If the API ever required HMAC-SHA1 or a runtime token
exchange, that real handshake would slot into this same worker-scoped fixture.

## Project structure

```
src/
  core/                         # shared infrastructure
    auth/OAuthPlaintext.ts      #   builds the OAuth 1.0 PLAINTEXT Authorization header
    config/env.ts               #   validated env loader (fails fast on missing secrets)
  api/                          # API interaction layer
    clients/WatchlistClient.ts  #   add / remove / retrieve wrappers
    clients/SearchClient.ts     #   findOpenListing() -> a live ListingId for test data
    schemas/watchlist.schema.ts #   Zod schemas shared by API + contract layers
  fixtures/api.fixture.ts       # Playwright fixture wiring the authed clients together
tests/
  api/                          # live API regression tests (the deliverable)
  contract/                     # Pact consumer contract tests (showcase)
```

The folders map to purpose: `core/` is cross-cutting plumbing, `api/` is the API
interaction layer that grows as endpoints are added, and `fixtures/` wires them
into Playwright.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your credentials
```

Required env vars (see `.env.example`): `CONSUMER_KEY`, `CONSUMER_SECRET`,
`TOKEN`, `TOKEN_SECRET`, `API_BASE_URL`.

## Running

```bash
npm run test:api        # live API regression tests (needs credentials)
npm run test:contract   # Pact consumer contracts (dummy creds, no network)
npm test                # everything
npm run report          # open the last HTML report
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push/PR to `main`:

- **contract** job — no secrets, always runs (dummy creds against the mock provider).
- **api** job — runs the live regression tests with credentials supplied via
  GitHub Actions secrets, and uploads the Playwright HTML report as an artifact.

## Out of scope: UI E2E

A UI smoke layer was considered but deliberately left out. The sandbox login page
is protected by reCAPTCHA, so automated browser logins are blocked by design
(they return "Whoops, that didn't work"). Working around bot protection in a test
environment — e.g. captcha-bypass keys or a shared saved session — is a decision
for the team that owns the environment, not something to bake into the regression
suite. The API layer already provides full, reliable coverage of the watchlist
behaviour; a UI layer can be added later if the team enables a test-friendly
login path.
