from typing import Dict, Any, List
import json
import os
import models as _models

mock_data_path = os.path.join(os.path.dirname(__file__), 'mock_reviews.json')

def load_mock_reviews() -> List[Dict[str, Any]]:
    try:
        with open(mock_data_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def normalize_review(raw_review: Dict[str, Any]) -> Dict[str, Any]:
    result = raw_review.get('result', {})
    channel = "Hostaway"
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
    try:
        rv = _models.Review(**normalized)
        return rv.dict()
    except Exception:
        return normalized
