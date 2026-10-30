// A notification's `url` is followed only when it is a path inside the app,
// never a link to another site ("//host" or "/\host" leave it).
export function isAppPath(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.startsWith("/\\")
  );
}
