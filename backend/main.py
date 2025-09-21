from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

mock_data_path = os.path.join(os.path.dirname(__file__), 'mock_reviews.json')

try:
    with open(mock_data_path, 'r') as f:
        raw_reviews = json.load(f)
except FileNotFoundError:
    raw_reviews = []


# Pydantic model for receiving approval updates
class ReviewApproval(BaseModel):
    id: int
    approved: bool

# Store approved review IDs in-memory (for demo)
approved_reviews = set()

def normalize_review(raw_review: Dict[str, Any]) -> Dict[str, Any]:
    result = raw_review.get('result', {})
    # Mock channel assignment for example purposes
    channel = "Hostaway"  # this could be randomized or read from real data if available

    normalized = {
        "id": result.get("id"),
        "listing": result.get("listingName"),
        "type": result.get("type"),
        "channel": channel,
        "date": result.get("submittedAt"),
        "reviewText": result.get("publicReview"),
        "categories": {cat["category"]: cat["rating"] for cat in result.get("reviewCategory", [])},
        "rating": result.get("rating"),
        "status": result.get("status"),
        "guestName": result.get("guestName"),
    }
    return normalized


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
        if approval.approved:
            approved_reviews.add(approval.id)
        else:
            approved_reviews.discard(approval.id)
    return {"approvedCount": len(approved_reviews)}