export const SITE_ORIGIN = "https://sendit.day";

// Same-origin guard for the API. Production accepts only the site itself;
// a development build also accepts same-host localhost.
export function allowedOrigin(
  origin: string | null,
  host: string | null,
  dev = false,
) {
  if (origin === SITE_ORIGIN) return true;
  if (!dev) return false;
  try {
    const url = new URL(origin ?? "");
    return (
      url.host === host && ["127.0.0.1", "localhost"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
