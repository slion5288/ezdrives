// ============================================================================
// EZDRIVES — Site-wide public configuration
// ============================================================================

/**
 * Google Places Autocomplete key for the student pickup-address field.
 *
 * To enable real address autocomplete:
 *  1. Google Cloud Console → enable "Places API" (and Maps JavaScript API).
 *  2. Create an API key; restrict it to your site origin (ezdrives.net).
 *  3. Paste the key here and rebuild + redeploy.
 *
 * When empty, the address field falls back to a plain text input (current
 * behaviour). The key is public by design (it is loaded in the browser) —
 * always use referrer restrictions in Google Cloud.
 */
export const GOOGLE_MAPS_API_KEY = ''
