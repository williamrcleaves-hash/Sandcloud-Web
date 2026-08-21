This folder is the public website only. No Pi secrets, no tunnel token, no installer.

Fill config.js (public values only) after aws/SETUP.txt:
  window.WORKER_ORIGIN
  window.AWS_API_URL
  window.COGNITO_REGION / COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID / COGNITO_DOMAIN
  window.COGNITO_REDIRECT_URI

API contract for a future Capacitor app: API.md
Auth helper: auth.js (Cognito PKCE)

On this Mac:
  Double-click Copy-Website-For-GitHub.command
  then upload Desktop/PrivacyHub-website into the existing Sandcloud-Web repo.

Live:
  https://williamrcleaves-hash.github.io/Sandcloud-Web/

LAN mode (opened from the Pi) still works without Cognito.
