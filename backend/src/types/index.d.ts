declare global {
  const CLIENT_ID: string;
  const CLIENT_SECRET: string;
  const REDIRECT_URI: string;
}

export namespace Spotify {
  export interface AccessTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token: string;
  }
}
