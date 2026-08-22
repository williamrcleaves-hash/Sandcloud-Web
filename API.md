# Sandcloud remote API (app-ready)

Same contract for GitHub Pages today and a Capacitor shell later. No API redesign required for the store app—only add a Cognito callback scheme (`sandcloud://` / universal links).

## Config (public)

Injected as `window.*` in `config.js` (or Capacitor env):

| Key | Purpose |
|---|---|
| `WORKER_ORIGIN` | Cloudflare Worker base (live status + `/cmd`) |
| `AWS_API_URL` | Lambda HTTP API (accounts + pairing registry) |
| `COGNITO_REGION` | `us-west-2` |
| `COGNITO_USER_POOL_ID` | Cognito User Pool |
| `COGNITO_CLIENT_ID` | Public SPA app client |
| `COGNITO_DOMAIN` | Hosted UI domain `https://….amazoncognito.com` |
| `COGNITO_REDIRECT_URI` | Must match Cognito callback URLs |

Never put `REGISTRY_KEY`, `HUB_PROXY_KEY`, tunnel tokens, or device secrets in the client.

## Auth

1. Cognito Hosted UI → Google → authorization code + **PKCE**.
2. Exchange code at `{COGNITO_DOMAIN}/oauth2/token`.
3. Store `id_token` / `access_token` / `refresh_token` (SPA: `localStorage` session; app: secure storage).
4. Every user call: `Authorization: Bearer <id_token>` (preferred; includes `email` + `aud` = client id).

LAN mode (Pi `10.10.10.1` / home IP): no Cognito on the Pi itself. The local page links to GitHub Pages with `?connect=<6-digit>` so pairing happens on HTTPS after Google sign-in (browsers block HTTPS sites from calling `http://10.10.10.1`).

## AWS registry (`AWS_API_URL`)

| Method | Path | Auth | Body / notes |
|---|---|---|---|
| GET | `/auth/whoami` | Bearer | `{ ok, sub, email }` |
| GET | `/me/device` | Bearer | `{ ok, device_id, email }` |
| POST | `/pair` | Bearer | `{ claim }` (NFC / tap link) or `{ code: "123456" }` → `{ ok, device_id }` |
| POST | `/unpair` | Bearer | clears user↔device binding |
| POST | `/internal/claim` | `X-Hub-Key` | Worker only: `{ device_id, claim }` (stable NFC token) |
| GET | `/internal/binding?sub=` | `X-Hub-Key` | Worker only: `{ device_id }` |

## Cloudflare Worker (`WORKER_ORIGIN`)

Device (Pi):

| Method | Path | Auth |
|---|---|---|
| POST | `/register` | body `device_id` + `device_secret` |
| POST | `/heartbeat` | HMAC `X-Hub-Signature` over `device_id.ts`; body may include `pair_code` + `snapshot` |

User:

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/me/router` | Bearer | `{ status: online\|offline\|no_router\|not_found, snapshot }` |
| POST | `/cmd` | Bearer | `{ path: "/api/…", body }` → proxied via tunnel to Pi |
| POST | `/pair` | Bearer | Proxies to AWS `/pair` if `REGISTRY_URL` set |
| POST | `/unpair` | Bearer | Proxies to AWS `/unpair` |

`status` offline when last heartbeat older than **300s**. Heartbeat KV writes throttled (~**120s**).

## Pi command paths (via `/cmd`)

`POST` body to Worker `/cmd`:

```json
{ "path": "/api/internet", "body": { "enabled": false } }
```

Useful paths: `/api/state` (LAN only GET), `/api/internet`, `/api/device`, `/api/list`, `/api/adblock`, `/api/vpn`, `/api/wan-renew`.

## E2E remote checklist (cellular)

1. Deploy AWS (`aws/SETUP.txt`) and fill `config.js`.
2. Set Worker secrets: `COGNITO_*`, `REGISTRY_URL`, `REGISTRY_KEY`, keep `TUNNEL_ORIGIN` + `HUB_PROXY_KEY`.
3. `npx wrangler deploy` from `worker/`.
4. Publish `web/` to Sandcloud-Web (include `auth.js`).
5. Factory / home: write the router’s tap URL to an NTAG213 as a URL record (`?claim=`).
6. Phone taps the sticker → Google sign-in → paired. Same URL as **Connect with Google** on the local page.
7. Confirm DynamoDB `USER#<sub>` / `DEVICE#…` binding. `CLAIM#` stays so the tag keeps working.
8. Toggle kill switch, block/allow, adblock; confirm public IP shows.
9. Second Google account cannot control the same router.
10. Wait >5 minutes with Pi powered off → UI shows offline; commands error clearly.

## Capacitor later

Wrap `web/`; set `COGNITO_REDIRECT_URI` to `sandcloud://callback` (add to Cognito app client); reuse `SandcloudAuth` + this API unchanged.
