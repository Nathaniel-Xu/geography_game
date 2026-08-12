/*
 * Backend configuration.
 *
 * The game is fully playable with none of this filled in — progress simply
 * stays in this browser's localStorage. Set `clientId` (and keep `dbName` in
 * step with the published module) to turn on sign-in and cross-device sync.
 *
 * Setup, once:
 *   1. `npm run cloud:login`     GitHub sign-in, links the CLI to your account
 *   2. `npm run cloud:publish`   publishes server/ to Maincloud
 *   3. dashboard -> your database -> SpacetimeAuth -> "Use SpacetimeAuth"
 *   4. Clients tab: copy the client id into `clientId` below, and register this
 *      app's URL as both a Redirect URI and a Post Logout Redirect URI. That is
 *      the page's own address, e.g. `http://127.0.0.1:8080/` in development —
 *      scheme, host, port and path all have to match.
 *   5. paste the same client id as the `audience` in the module's SEED_POLICY
 *      and republish, so tokens minted for other projects are refused.
 */

/** Point the app at a different deployment without editing this file. */
const dev = (key, fallback) => {
  try {
    return localStorage.getItem(`geoquiz.cfg.${key}`) || fallback;
  } catch {
    return fallback; // private mode
  }
};

export const SPACETIME = {
  // Maincloud's documented endpoint. A local module is ws://127.0.0.1:3000.
  host: dev('host', 'https://maincloud.spacetimedb.com'),
  dbName: dev('db', 'geography-game'),
};

export const OIDC = {
  authority: dev('authority', 'https://auth.spacetimedb.com/oidc'),
  clientId: dev('clientId', ''),
  scope: 'openid profile email',
};

/** Sign-in is offered only once a client id exists to authenticate against. */
export const CLOUD_ENABLED = Boolean(OIDC.clientId && SPACETIME.host && SPACETIME.dbName);
