// ============================================================================
// EZDRIVES — Site-wide public configuration
// ============================================================================

/**
 * Google Places Autocomplete key for the student pickup-address field.
 *
 * The address autocomplete calls the Places API (New) REST endpoint
 * (https://places.googleapis.com/v1/places:autocomplete) directly from the
 * browser. Requirements:
 *  1. Google Cloud Console → enable "Places API (New)" (places.googleapis.com)
 *     for this project.
 *  2. This key must have referrer restrictions that include ezdrives.net.
 *
 * While the API is disabled (or the key invalid), the address field silently
 * falls back to a plain text input — the rest of the site is unaffected.
 * The key is public by design (loaded in the browser); always restrict it in
 * Google Cloud (API & Services → Keys → restrict to your site referrers).
 */
export const GOOGLE_MAPS_API_KEY = 'AIzaSyAC1n-3BAudQmPFAE-s52PTT8K70gg5sd8'
