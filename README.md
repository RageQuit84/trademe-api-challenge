# API-Automation-Challenge

## Overview

In this challenge you're given a scenario and a set of tasks, similar to what you'd see day to day at Trade Me. It should take around 2-3 hours. Reach out if you have any questions.

When you're done, share your solution as a GitHub/GitLab link (or similar).

## Scenario

You've just joined the team that looks after the watchlist feature. A change is going out next sprint and the team needs API regression tests in place before it ships. Make sure existing watchlist behaviour is covered and the tests can run in CI.

## Acceptance Criteria

1. A user should be able to add a listing to their watchlist
2. A user should be able to remove items from their watchlist
3. A user should only be able to view their own watchlist
4. A user should be able to filter their watchlist by different criteria

## Setup

Tests run against our Sandbox environment (public facing).

- UI: https://www.tmsandbox.co.nz
- API: https://api.tmsandbox.co.nz/v1

Use whatever language or tooling you're comfortable with. Don't include personal information like date of birth, address or credit card details in any data you create.

## Authentication

The sandbox API uses OAuth 1.0 with PLAINTEXT signing. Here's how to get set up:

1. Create a sandbox account at https://www.tmsandbox.co.nz/Members/Register.aspx
2. Register a new application at https://www.tmsandbox.co.nz/MyTradeMe/Api/RegisterNewApplication.aspx and get your Consumer Key and Consumer Secret
3. Generate an access token at https://developer.trademe.co.nz/api-overview/authentication. Enter your Consumer Key and Secret and you'll get an OAuth Token and Token Secret. You can ignore the sections on "Implementing the OAuth redirection-based authorization process" and "Implementing xAuth".
4. Look at the instructions on https://developer.trademe.co.nz/api-overview/authentication/example-plaintext-workflow under the "Making your first request" header for instructions about how to create your auth header. For example, header should look like this:

```
Authorization: OAuth oauth_consumer_key="YOUR_CONSUMER_KEY", oauth_token="YOUR_OAUTH_TOKEN", oauth_signature_method="PLAINTEXT", oauth_signature="YOUR_CONSUMER_SECRET&YOUR_TOKEN_SECRET"
```


## Resources

| Resource | Link |
| --- | --- |
| Auth instructions | https://developer.trademe.co.nz/api-overview/authentication |
| Registering an application | https://developer.trademe.co.nz/api-overview/registering-an-application/ |
| Retrieve the details of a single listing | https://developer.trademe.co.nz/api-reference/listing-methods/retrieve-the-details-of-a-single-listing/ |
| Add a listing to your watchlist | https://developer.trademe.co.nz/api-reference/my-trade-me-methods/add-a-listing-to-your-watchlist/ |
| Retrieve and filter your watchlist | https://developer.trademe.co.nz/api-reference/my-trade-me-methods/retrieve-your-watchlist/ |
| Remove a listing from your watchlist | https://developer.trademe.co.nz/api-reference/my-trade-me-methods/remove-a-listing-from-your-watchlist/ |

## FAQ

### Q: I didn't get a confirmation email, is that normal?

The sandbox doesn't send emails. If you didn't see the welcome message when registering you may have used the wrong link. Double check you used the sandbox link above and not the main Trade Me site.

### Q: My OAuth token stopped working

Tokens expire if unused for 6+ months or if the account password changes. If you're getting 401s, generate a new token following the Authentication steps above.

---

## Solution

This repo contains a TypeScript + Playwright test framework covering the watchlist
acceptance criteria above against the deployed sandbox, plus a Pact consumer
contract layer.

See **[docs/TESTING.md](docs/TESTING.md)** for the full write-up: the testing
layers and why they exist, the tools and frameworks used, acceptance-criteria
coverage, project structure, setup, and CI.

Quick start:

```bash
npm install
cp .env.example .env     # fill in your sandbox credentials
npm run test:api         # live API regression tests
npm run test:contract    # Pact consumer contracts (no network)
```

### Where this would go next

A few deliberate scope decisions are worth calling out, as they shape where the
remaining test value belongs rather than what's missing here:

- **Contract testing — the team owns the provider side.** The Watchlist team
  owns the watchlist API, so in a real setup it would be the *provider* in any
  consumer-driven contract: publishing the API, then verifying incoming consumer
  contracts against it (e.g. via a Pact broker in CI). The Pact specs in this
  repo are written from the *consumer* perspective purely as an illustration of
  how this team would interact with the teams that depend on the watchlist —
  a worked example of the contract handshake, not the team's own production
  contract suite.

- **Edge cases belong closer to the code.** Cases like filter *semantics* (does
  `ReserveMet` truly return only reserve-met items?) and pagination boundaries
  (last-page remainders, out-of-range pages, off-by-one) were considered but
  intentionally left out of this black-box suite. They can't be verified
  deterministically against a shared sandbox where empty results are valid, and
  they're far cheaper and more reliable as **integration tests against an
  ephemeral, seeded database**, driven from the controllers in-process. That's
  where this coverage should live.

- **UI end-to-end as a complement.** If the deployed environment introduces
  networking rules or access considerations — auth gateways, CORS, region/IP
  restrictions, CDN or edge routing — that the API tests alone can't exercise, a
  thin layer of **UI end-to-end tests** against the real environment would be a
  sensible addition to confirm a user can actually reach and use their watchlist
  through the full stack.
