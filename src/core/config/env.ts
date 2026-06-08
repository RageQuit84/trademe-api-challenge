import * as dotenv from 'dotenv';

// Ensure .env is loaded even when this module is imported outside of the
// Playwright config bootstrap (e.g. by the Pact contract specs).
dotenv.config();

export interface AppConfig {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
  apiBaseUrl: string;
}

/**
 * Reads a required environment variable, throwing a clear error if it is
 * missing or blank so failures surface at startup rather than mid-request.
 */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env and fill in your Trade Me sandbox credentials.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

let cached: AppConfig | undefined;

/**
 * Returns the validated application configuration, loaded once and cached.
 */
export function getConfig(): AppConfig {
  if (cached) {
    return cached;
  }

  cached = {
    consumerKey: required('CONSUMER_KEY'),
    consumerSecret: required('CONSUMER_SECRET'),
    token: required('TOKEN'),
    tokenSecret: required('TOKEN_SECRET'),
    apiBaseUrl: optional('API_BASE_URL', 'https://api.tmsandbox.co.nz/v1'),
  };

  return cached;
}
