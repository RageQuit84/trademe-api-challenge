/**
 * Builds an OAuth 1.0 PLAINTEXT `Authorization` header for the Trade Me API.
 *
 * PLAINTEXT signing is the simplest OAuth 1.0 signature method: the signature
 * is literally `consumerSecret&tokenSecret`. Because we already hold an access
 * token + secret, no request-token exchange, nonce, or timestamp is needed.
 *
 * See: https://developer.trademe.co.nz/api-overview/authentication/example-plaintext-workflow
 */
export interface OAuthCredentials {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

export class OAuthPlaintext {
  private cachedHeaderValue?: string;

  constructor(private readonly credentials: OAuthCredentials) {}

  /**
   * The PLAINTEXT signature: `consumerSecret&tokenSecret`, percent-encoded.
   * When a two-legged (consumer-only) call is made, the token secret is empty,
   * yielding `consumerSecret&`.
   */
  private signature(): string {
    const raw = `${this.credentials.consumerSecret}&${this.credentials.tokenSecret}`;
    return encodeURIComponent(raw);
  }

  /**
   * Returns the value for the `Authorization` header. PLAINTEXT signing has no
   * nonce or timestamp, so the header is constant for a given set of
   * credentials — we compute it once and reuse it for every request.
   */
  buildHeaderValue(): string {
    if (this.cachedHeaderValue === undefined) {
      const params = [
        `oauth_consumer_key="${this.credentials.consumerKey}"`,
        `oauth_token="${this.credentials.token}"`,
        `oauth_signature_method="PLAINTEXT"`,
        `oauth_signature="${this.signature()}"`,
      ];
      this.cachedHeaderValue = `OAuth ${params.join(', ')}`;
    }
    return this.cachedHeaderValue;
  }

  /**
   * Returns a headers object ready to spread into a request.
   */
  buildHeaders(): { Authorization: string } {
    return { Authorization: this.buildHeaderValue() };
  }
}
