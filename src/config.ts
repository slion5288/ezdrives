// ============================================================================
// EZDRIVES — Site-wide public configuration
// ============================================================================

/**
 * Geoapify Geocoding/Places API key for the student pickup-address field.
 *
 * The address autocomplete calls the Geoapify autocomplete endpoint directly
 * from the browser:
 *   GET https://api.geoapify.com/v1/geocode/autocomplete?text=…&apiKey=…&bias=countrycode:ca&format=json
 *
 * Geoapify is free for small sites (≈3,000 requests/day free tier — plenty for
 * this website). Get a key here: https://www.geoapify.com/ (sign up → create a
 * project → copy the API key), then paste it below. You may also restrict the
 * key to the ezdrives.net domain in the Geoapify dashboard.
 *
 * While the key is empty, the address field silently falls back to a plain
 * text input — the rest of the site is unaffected.
 */
export const GEOAPIFY_API_KEY = ''
