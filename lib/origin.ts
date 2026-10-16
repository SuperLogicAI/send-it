// The signed-in app. The bare sendit.day host serves the public landing page.
export const APP_ORIGIN = "https://app.sendit.day";
export const isSiteHost = (host: string | null) =>
  host === "sendit.day" || host === "www.sendit.day";

// Same-origin guard for the API. Production accepts only the app itself;
// a development build also accepts same-host localhost.
export function allowedOrigin(
  origin: string | null,
  host: string | null,
  dev = false,
) {
  if (origin === APP_ORIGIN) return true;
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
