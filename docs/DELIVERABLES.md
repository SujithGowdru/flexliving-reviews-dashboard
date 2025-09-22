Flex Living — Reviews Dashboard Deliverables

Summary
This deliverable contains the source code (frontend and backend) for a Reviews Dashboard that:
- Normalizes Hostaway mock review JSON and surfaces per-property performance
- Lets managers filter, sort, and approve reviews for public display
- Provides a development-safe server connector to fetch Google Place reviews by Place ID (requires GOOGLE_API_KEY)

Tech stack
- Backend: FastAPI, uvicorn, Python 3.13 (project venv at `backend/venv`)
- Frontend: React + TypeScript (Vite), react-chartjs-2 / chart.js for charts
- Storage: Demo uses in-memory approved IDs and localStorage for persistence in-browser

How to run locally
1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Optional: set Google API key to enable Place Details
export GOOGLE_API_KEY="<your_key>"
uvicorn main:app --reload --port 8000 --app-dir $(pwd)
```

2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Run notes
- Backend endpoints:
  - GET /api/reviews/hostaway — returns normalized Hostaway mock reviews
  - POST /api/reviews/approve — accepts [{id, approved}] to update demo in-memory approved IDs
  - GET /api/reviews/approved — returns {approved: [ids]}
  - GET /api/reviews/google?place_id=... — fetches Google Place Details reviews (requires GOOGLE_API_KEY; returns 501 if missing)

Key design and logic decisions
- Normalization:
  - Hostaway mock data is normalized in `backend/main.py` (function `normalize_review`) to a consistent schema: {id, listing, type, channel, date, reviewText, categories, rating, status, guestName}.
  - Google reviews are normalized in the `/api/reviews/google` endpoint to the same schema with negative IDs to avoid collisions.
- Approval flow:
  - Managers toggle "Display on Website" in the Dashboard; approvals are persisted client-side in localStorage and sent to `/api/reviews/approve` (demo server updates an in-memory set).
  - `PropertyReviews` fetches `/api/reviews/approved` and shows only approved reviews by default; a Preview toggle allows managers to view all reviews including fetched Google reviews.
- UX choices:
  - Chart visualization for per-property average rating to help quickly spot underperforming properties.
  - Filters: property, channel, rating, category and sort options (date or rating) so managers can quickly find specific feedback.
  - Inline property detail panel to replicate property page review area and allow quick approval workflows.

API behaviors and edge cases
- /api/reviews/hostaway: returns reviews sorted by date descending; if mock JSON missing returns 404.
- /api/reviews/approve: updates an in-memory set; not persisted across server restarts.
- /api/reviews/approved: returns the currently approved ids array.
- /api/reviews/google: server-side call to Google Places Details; returns 501 if GOOGLE_API_KEY missing, 502 if remote errors, or 404 if Google returns non-OK status.

Google Reviews findings
- Google Places API can return place reviews via Place Details; requires Places API key and is billable beyond free-tier.
- Implementation in this project: server endpoint `/api/reviews/google` that proxies Place Details requests and normalizes reviews—safe for dev usage.
- Recommendations for production:
  - Store and map Place IDs to properties in the database.
  - Cache responses and respect rate limits and billing.
  - Secure API key and add usage restrictions (HTTP referrer, IP restrictions).

Evaluation criteria mapping (where to look in code)
- Handling and normalization of real-world JSON review data:
  - `backend/main.py` normalize_review + /api/reviews/google normalization
- Code clarity and structure:
  - Backend: `backend/main.py` (endpoints and normalization)
  - Frontend: `frontend/src/Dashboard.tsx`, `frontend/src/components/PropertyReviews.tsx`
- UX/UI design quality and decision-making:
  - Dashboard chart and filters in `Dashboard.tsx` and review detail UI in `PropertyReviews.tsx`
- Insightfulness of features:
  - Category filters, sorting, and approval workflow are implemented in `Dashboard.tsx`
- Problem-solving initiative:
  - Google connector added and documented in `docs/google_reviews.md` and implemented in `backend/main.py`

Files changed / added
- backend/main.py (new endpoints and Google integration)
- backend/requirements.txt (notes about removed dependency)
- frontend/src/Dashboard.tsx (chart, filters, sorting, detail panel)
- frontend/src/components/PropertyReviews.tsx (approved reviews + Google fetch UI)
- docs/google_reviews.md
- docs/DELIVERABLES.md

Contact / Next steps
- I can implement secure Place ID mapping, server caching, or switch the approval persistence to a simple file or DB. Tell me which you'd prefer and I'll add it to the plan.
