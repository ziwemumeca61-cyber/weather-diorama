/**
 * Shareable deep-link support: the loaded city lives in the URL's `?city=`
 * param so a link reopens the same diorama, and copying the address bar shares
 * it. We only round-trip the city name (what geocoding needs); everything else
 * is re-derived live.
 */

export function readCityParam(): string | null {
  try {
    const v = new URLSearchParams(window.location.search).get('city')
    return v && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

/** Reflect the current city into the URL without adding a history entry. */
export function writeCityParam(name: string): void {
  try {
    const url = new URL(window.location.href)
    if (name) url.searchParams.set('city', name)
    else url.searchParams.delete('city')
    window.history.replaceState(null, '', url.toString())
  } catch {
    /* ignore */
  }
}
