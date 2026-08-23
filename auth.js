/**
 * Cognito Hosted UI (Google) with PKCE for Sandcloud SPA / future Capacitor app.
 * Public config from window.* in config.js
 */
(function (global) {
  const STORAGE = "sandcloud_auth_v1";
  const CONNECT_KEY = "sandcloud_connect";
  const CLAIM_KEY = "sandcloud_claim";

  function cfg() {
    return {
      domain: String(global.COGNITO_DOMAIN || "").replace(/\/$/, ""),
      clientId: String(global.COGNITO_CLIENT_ID || ""),
      region: String(global.COGNITO_REGION || "us-west-2"),
      redirect: String(global.COGNITO_REDIRECT_URI || global.location.origin + global.location.pathname),
    };
  }

  function b64url(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function sha256(str) {
    const data = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-256", data);
  }

  function randomString(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return b64url(a);
  }

  function captureConnectFromUrl() {
    const params = new URLSearchParams(location.search);
    const claim = String(params.get("claim") || "")
      .toLowerCase()
      .replace(/[^a-f0-9]/g, "");
    if (claim.length === 32) sessionStorage.setItem(CLAIM_KEY, claim);
    const digits = String(params.get("connect") || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (digits.length === 6) sessionStorage.setItem(CONNECT_KEY, digits);
    return pendingClaim() || pendingConnect();
  }

  function pendingClaim() {
    const claim = String(sessionStorage.getItem(CLAIM_KEY) || "").toLowerCase();
    return /^[a-f0-9]{32}$/.test(claim) ? claim : "";
  }

  function pendingConnect() {
    const digits = String(sessionStorage.getItem(CONNECT_KEY) || "").replace(/\D/g, "");
    return digits.length === 6 ? digits : "";
  }

  function clearPendingConnect() {
    sessionStorage.removeItem(CONNECT_KEY);
    sessionStorage.removeItem(CLAIM_KEY);
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || "null");
    } catch {
      return null;
    }
  }

  function save(session) {
    if (!session) localStorage.removeItem(STORAGE);
    else localStorage.setItem(STORAGE, JSON.stringify(session));
  }

  function configured() {
    const c = cfg();
    return Boolean(c.domain && c.clientId);
  }

  function idToken() {
    const s = load();
    if (!s || !s.id_token) return null;
    if (s.expires_at && Date.now() > s.expires_at - 30_000) return null;
    return s.id_token;
  }

  function accessToken() {
    const s = load();
    return s?.access_token || null;
  }

  function bearer() {
    // Prefer ID token (has aud = client id + email); Worker accepts either.
    return idToken() || accessToken();
  }

  function isSignedIn() {
    return Boolean(bearer());
  }

  async function loginWithProvider(identityProvider) {
    captureConnectFromUrl();
    const c = cfg();
    if (!c.domain || !c.clientId) throw new Error("Cognito not configured");
    const verifier = randomString(32);
    const challenge = b64url(await sha256(verifier));
    const state = randomString(16);
    sessionStorage.setItem("sandcloud_pkce", JSON.stringify({ verifier, state }));
    const q = new URLSearchParams({
      client_id: c.clientId,
      response_type: "code",
      scope: "openid email profile",
      redirect_uri: c.redirect,
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
      identity_provider: identityProvider,
    });
    location.href = `${c.domain}/oauth2/authorize?${q}`;
  }

  async function loginWithGoogle() {
    return loginWithProvider("Google");
  }

  async function loginWithApple() {
    return loginWithProvider("SignInWithApple");
  }

  async function loginWithEmail() {
    return loginWithProvider("COGNITO");
  }

  async function handleRedirect() {
    captureConnectFromUrl();
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code) return false;
    const raw = sessionStorage.getItem("sandcloud_pkce");
    sessionStorage.removeItem("sandcloud_pkce");
    const pkce = raw ? JSON.parse(raw) : null;
    if (!pkce || pkce.state !== state) throw new Error("bad oauth state");
    const c = cfg();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: c.clientId,
      code,
      redirect_uri: c.redirect,
      code_verifier: pkce.verifier,
    });
    const r = await fetch(`${c.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "token exchange failed");
    save({
      id_token: data.id_token,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    });
    history.replaceState({}, "", location.pathname);
    return true;
  }

  async function logout() {
    const c = cfg();
    save(null);
    if (c.domain && c.clientId) {
      const q = new URLSearchParams({
        client_id: c.clientId,
        logout_uri: c.redirect,
      });
      location.href = `${c.domain}/logout?${q}`;
      return;
    }
  }

  async function refreshIfNeeded() {
    const s = load();
    if (!s?.refresh_token) return bearer();
    if (s.expires_at && Date.now() < s.expires_at - 60_000) return bearer();
    const c = cfg();
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: c.clientId,
      refresh_token: s.refresh_token,
    });
    const r = await fetch(`${c.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      save(null);
      return null;
    }
    save({
      ...s,
      id_token: data.id_token || s.id_token,
      access_token: data.access_token || s.access_token,
      expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    });
    return bearer();
  }

  global.SandcloudAuth = {
    configured,
    isSignedIn,
    bearer,
    loginWithGoogle,
    loginWithApple,
    loginWithEmail,
    handleRedirect,
    logout,
    refreshIfNeeded,
    captureConnectFromUrl,
    pendingConnect,
    pendingClaim,
    clearPendingConnect,
  };
})(window);
