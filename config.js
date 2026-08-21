// Public client config only (safe in GitHub Pages / future Capacitor).
// Fill Cognito + AWS_API_URL after aws/deploy.sh (see aws/SETUP.txt).
window.PRIVACY_HUB_API = "";
window.WORKER_ORIGIN = "https://sandcloud-hub.betternights.workers.dev";

window.AWS_API_URL = "https://3ajnfd6z60.execute-api.us-west-2.amazonaws.com"; // e.g. https://xxxx.execute-api.us-west-2.amazonaws.com
window.COGNITO_REGION = "us-west-2";
window.COGNITO_USER_POOL_ID = "us-west-2_iD9PiEhp0"; // e.g. us-west-2_AbCdEf
window.COGNITO_CLIENT_ID = "7ggqpr1kdruagi5ai0ls92up94";
window.COGNITO_DOMAIN = "https://sandcloud-026268603082.auth.us-west-2.amazoncognito.com"; // e.g. https://sandcloud-123456789012.auth.us-west-2.amazoncognito.com
// Optional override; default = current page folder URL
window.COGNITO_REDIRECT_URI = "https://williamrcleaves-hash.github.io/Sandcloud-Web/";

// Legacy GIS client (unused once Cognito is live; keep for Google console reference)
window.GOOGLE_CLIENT_ID =
  "476588462941-b6elei2ono7kn4fbpa37abm0u245denb.apps.googleusercontent.com";
