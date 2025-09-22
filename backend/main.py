from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from pydantic import BaseModel
from typing import List, Dict, Any
import os
from urllib import request as urllib_request, parse as urllib_parse
import json as _json
import db as _db
import models as _models
import reviews as _reviews

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

raw_reviews = _reviews.load_mock_reviews()


# Pydantic model for receiving approval updates
class ReviewApproval(BaseModel):
    id: int
    approved: bool


# Pydantic model for place mapping
class PlaceMapping(BaseModel):
    listing: str
    place_id: str

# Use DB-based approvals
approved_db = _db.db

def normalize_review(raw_review: Dict[str, Any]) -> Dict[str, Any]:
    return _reviews.normalize_review(raw_review)


@app.get("/api/reviews/hostaway")
async def get_hostaway_reviews():
    if not raw_reviews:
        raise HTTPException(status_code=404, detail="No reviews found")
    normalized_reviews = [normalize_review(r) for r in raw_reviews]
    # Optionally, sort reviews by date descending
    normalized_reviews.sort(key=lambda r: r["date"], reverse=True)
    return {"reviews": normalized_reviews}

@app.post("/api/reviews/approve")
async def approve_reviews(approvals: List[ReviewApproval]):
    for approval in approvals:
        approved_db.set_approval(approval.id, approval.approved)
    return {"approvedCount": len(approved_db.list_approved()), "approved": approved_db.list_approved()}


@app.get("/api/reviews/approved")
async def get_approved_reviews():
    """Return the list of approved review IDs from DB."""
    return {"approved": approved_db.list_approved()}


@app.get("/api/reviews/approved-with-ts")
async def get_approved_reviews_with_ts():
    return {"approved": approved_db.list_approved_with_ts()}


@app.post("/api/place-mapping")
async def set_place_mapping(mapping: PlaceMapping):
    approved_db.set_place_mapping(mapping.listing, mapping.place_id)
    return {"ok": True}


@app.get("/api/place-mapping")
async def get_place_mapping(listing: str):
    place = approved_db.get_place_mapping(listing)
    if not place:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return {"place_id": place}


@app.delete("/api/place-mapping")
async def delete_place_mapping(listing: str):
    existing = approved_db.get_place_mapping(listing)
    if not existing:
        raise HTTPException(status_code=404, detail="Mapping not found")
    approved_db.delete_place_mapping(listing)
    return {"ok": True}


@app.get("/api/reviews/google")
async def get_google_reviews(place_id: str):
    """Fetch Google Place Details reviews for a given place_id and normalize them.

    Requires environment variable GOOGLE_API_KEY to be set. This endpoint is a
    small demo wrapper intended for local development only.
    """
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=501, detail="GOOGLE_API_KEY not configured on server")

    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {"place_id": place_id, "fields": "reviews,formatted_address,name", "key": api_key}

    qs = urllib_parse.urlencode(params)
    req_url = f"{url}?{qs}"

    # Try DB cache first
    cache = approved_db.get_google_cache(place_id)
    if cache:
        return {"reviews": cache.get("reviews", []), "place": cache.get("place")}

    try:
        with urllib_request.urlopen(req_url, timeout=10) as resp:
            resp_body = resp.read().decode("utf-8")
            payload = _json.loads(resp_body)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google API error: {e}")

    status = payload.get("status")
    if status != "OK":
        raise HTTPException(status_code=404, detail=f"Google API returned {status}")

    result = payload.get("result", {})
    raw_reviews = result.get("reviews", [])

    normalized = []
    for i, r in enumerate(raw_reviews):
        obj = {
            "id": -(i + 1),  # negative ids to avoid colliding with hostaway mock ids
            "listing": result.get("name"),
            "type": "google",
            "channel": "Google",
            "date": r.get("relative_time_description") or r.get("time"),
            "reviewText": r.get("text"),
            "categories": {},
            "rating": r.get("rating"),
            "status": "published",
            "guestName": r.get("author_name"),
        }
        try:
            rv = _models.Review(**obj)
            normalized.append(rv.dict())
        except Exception:
            normalized.append(obj)

    place_obj = {"name": result.get("name"), "address": result.get("formatted_address")}
    # Cache payload
    approved_db.set_google_cache(place_id, _json.dumps({"reviews": normalized, "place": place_obj}))

    return {"reviews": normalized, "place": place_obj}