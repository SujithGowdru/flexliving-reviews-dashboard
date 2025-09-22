Google Reviews integration exploration

Summary
- Google Places / Place Details APIs can return place reviews, but access is limited and subject to Google policies.
- Pulling reviews requires a Places API key and may incur billing.
- For production use, you must follow Google Maps Platform Terms of Service and ensure you have appropriate permissions from each property owner.

Feasibility
- The Places API can return reviews for a Place ID via Place Details.
- Reviews are limited to a small number and may not include all metadata available from Hostaway/Airbnb.
- Automated bulk scraping of Google Reviews is against Google's terms; use the official Places API.

Implementation outline
1. Obtain an API key with Places API enabled.
2. Resolve property addresses/listings to Google Place IDs (may require manual mapping).
3. Call Place Details with fields=review to fetch reviews. Example request:
   https://maps.googleapis.com/maps/api/place/details/json?place_id=PLACE_ID&fields=reviews&key=API_KEY
4. Normalize returned reviews to the app's schema and merge with other channels.

Limitations and concerns
- Rate limits and billing: Places API is billed; monitor usage.
- Review availability: Not all properties will have place entries or reviews.
- Compliance: Ensure compliance with Google's terms and local privacy laws.

Recommendation
- For a minimal MVP, implement an optional connector that fetches reviews for mapped Place IDs on-demand and surfaces them in the dashboard as an additional channel.
- If frequent sync is needed, cache results and respect rate limits.

Next steps
- Decide which properties to support and create a Place ID mapping table.
- Prototype a server-side endpoint that fetches and normalizes Google reviews using a secured API key.
- Add UI to surface Google reviews alongside Hostaway data (channel filter already exists).
