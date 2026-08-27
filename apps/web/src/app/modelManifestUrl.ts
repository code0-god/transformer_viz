export function modelManifestUrl(
  baseUrl = import.meta.env.BASE_URL,
  origin = window.location.origin,
): string {
  return new URL(`${baseUrl}models/edu/manifest.json`, `${origin}/`).href;
}
