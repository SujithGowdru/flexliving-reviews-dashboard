from backend import reviews


def test_normalize_basic():
    sample = {
        "status": "success",
        "result": {
            "id": 9999,
            "type": "guest-to-host",
            "status": "published",
            "rating": 8,
            "publicReview": "Great stay",
            "reviewCategory": [{"category":"cleanliness","rating":8}],
            "submittedAt": "2023-06-15 10:12:05",
            "guestName": "Test User",
            "listingName": "Test Listing"
        }
    }
    out = reviews.normalize_review(sample)
    assert out["id"] == 9999
    assert out["listing"] == "Test Listing"
    assert out["rating"] == 8
    assert out["categories"]["cleanliness"] == 8
