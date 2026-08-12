/*
 * OpenID Connect sign-in — Authorization Code flow with PKCE, no dependencies.
 *
 * PKCE (RFC 7636) is what makes a public client like this static page safe: the
 * authorization code is bound to a one-time secret held only in this tab, so an
 * intercepted code is worthless on its own. There is no client secret, and
 * nothing here needs a server of our own.
 *
 * The redirect target is the page's own URL, so a deployment only has to
 * register one Redirect URI. The `code`/`state` pair is consumed and scrubbed
 * from the address bar on the way back in.
 */
import { OIDC } from './config.js';

const TOKENS = 'geoquiz.auth.v1';
/** Per-tab, and deliberately not localStorage: a PKCE verifier is single-use. */
const FLIGHT = 'geoquiz.auth.flight';

/** Must be byte-identical in the authorize, token and logout calls. */
const redirectUri = () => location.origin + location.pathname;

const b64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomB64 = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));

/** JWT payload without verifying: the server verifies, we only want the claims. */
function decodeClaims(jwt) {
  try {
    const raw = atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(TOKENS) || 'null');
  } catch {
    return null;
  }
}

function save(session) {
  try {
    if (session) localStorage.setItem(TOKENS, JSON.stringify(session));
    else localStorage.removeItem(TOKENS);
  } catch {
    /* private mode: sign-in lasts for this page only */
  }
}

let metadata = null;

/**
 * OIDC discovery. One network call per page load, so a provider that rotates
 * endpoints does not need a client release.
 */
async function discover() {
  if (metadata) return metadata;
  const url = `${OIDC.authority.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OIDC discovery failed: HTTP ${res.status}`);
  metadata = await res.json();
  if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
    throw new Error('OIDC discovery document is missing required endpoints');
  }
  return metadata;
}

/** Send the browser to the provider's login page. */
export async function signIn() {
  const meta = await discover();
  const verifier = randomB64(32);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const state = randomB64(16);
  const nonce = randomB64(16);
  sessionStorage.setItem(FLIGHT, JSON.stringify({ verifier, state, nonce }));

  const q = new URLSearchParams({
    response_type: 'code',
    client_id: OIDC.clientId,
    redirect_uri: redirectUri(),
    scope: OIDC.scope,
    state,
    nonce,
    code_challenge: b64url(new Uint8Array(digest)),
    code_challenge_method: 'S256',
  });
  location.assign(`${meta.authorization_endpoint}?${q}`);
}

/**
 * Consume a `?code=...` redirect, if this load is one.
 *
 * @returns {Promise<{handled: boolean, error?: string}>}
 */
export async function completeSignIn() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const error = params.get('error');
  if (!code && !error) return { handled: false };

  const flight = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(FLIGHT) || 'null');
    } catch {
      return null;
    }
  })();
  sessionStorage.removeItem(FLIGHT);
  history.replaceState({}, document.title, redirectUri());

  if (error) return { handled: true, error: params.get('error_description') || error };
  // A code with no matching verifier is either a replay or a cross-tab mix-up.
  if (!flight || params.get('state') !== flight.state) {
    return { handled: true, error: 'Sign-in state did not match. Please try again.' };
  }

  const meta = await discover();
  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: OIDC.clientId,
      code_verifier: flight.verifier,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.id_token) {
    return { handled: true, error: body?.error_description || body?.error || `Token exchange failed (HTTP ${res.status})` };
  }

  const claims = decodeClaims(body.id_token);
  if (!claims) return { handled: true, error: 'Provider returned an unreadable id token.' };
  if (flight.nonce && claims.nonce && claims.nonce !== flight.nonce) {
    return { handled: true, error: 'Sign-in nonce did not match. Please try again.' };
  }

  save({ idToken: body.id_token, refreshToken: body.refresh_token || null, claims });
  return { handled: true };
}

/**
 * A currently-valid id token, or null.
 *
 * Refreshes when the provider issued a refresh token; otherwise an expired
 * session simply ends — the caller falls back to offline play and the next
 * `signIn()` is a quiet redirect, because the provider's own session is intact.
 */
export async function idToken() {
  const session = load();
  if (!session?.idToken) return null;

  const exp = Number(session.claims?.exp || 0) * 1000;
  if (exp && exp - Date.now() > 60_000) return session.idToken;

  if (!session.refreshToken) {
    save(null);
    return null;
  }
  try {
    const meta = await discover();
    const res = await fetch(meta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: OIDC.clientId,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.id_token) throw new Error(body?.error || `HTTP ${res.status}`);
    const claims = decodeClaims(body.id_token);
    save({
      idToken: body.id_token,
      refreshToken: body.refresh_token || session.refreshToken,
      claims: claims || session.claims,
    });
    return body.id_token;
  } catch {
    save(null);
    return null;
  }
}

/** Display identity from the stored token, or null when signed out. */
export function account() {
  const claims = load()?.claims;
  if (!claims?.sub) return null;
  return {
    sub: claims.sub,
    name: claims.name || claims.preferred_username || claims.nickname || claims.email || 'Signed in',
    picture: claims.picture || '',
    email: claims.email || '',
  };
}

/**
 * Drop the local session, then end the provider session too when it supports
 * it — otherwise "sign out, sign in" would silently return the same account.
 */
export async function signOut() {
  const session = load();
  save(null);
  let meta = null;
  try {
    meta = await discover();
  } catch {
    /* offline: the local session is already gone, which is the important half */
  }
  if (meta?.end_session_endpoint) {
    const q = new URLSearchParams({ post_logout_redirect_uri: redirectUri() });
    if (session?.idToken) q.set('id_token_hint', session.idToken);
    if (OIDC.clientId) q.set('client_id', OIDC.clientId);
    location.assign(`${meta.end_session_endpoint}?${q}`);
    return true;
  }
  return false;
}
