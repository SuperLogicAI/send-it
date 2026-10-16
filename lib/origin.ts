// Same-origin guard for the API. Local development only until step 1.4
// replaces it with Cloudflare Access plus an Origin check for https://sendit.day.
export function allowedOrigin(origin: string | null, host: string | null) {
  try {
    const url = new URL(origin ?? "");
    return (
      url.host === host && ["127.0.0.1", "localhost"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
