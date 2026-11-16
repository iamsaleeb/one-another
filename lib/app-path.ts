// A placeholder origin: a path is inside the app when resolving it against
// this origin stays on it.
const APP_ORIGIN = "http://app.invalid";

// Whether `url` is a path inside the app, never a link to another site.
// Browsers read "//host" and "/\host" as other sites, and drop tabs and
// newlines first ("/\t/host"), so this asks the URL parser rather than
// matching prefixes.
export function isAppPath(url: unknown): url is string {
  if (typeof url !== "string" || !url.startsWith("/")) return false;
  try {
    return new URL(url, APP_ORIGIN).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

// Where to send the user after sign-in or onboarding: `url` when it is a path
// inside the app, otherwise home.
export function safeRedirectPath(url: unknown): string {
  return isAppPath(url) ? url : "/";
}
