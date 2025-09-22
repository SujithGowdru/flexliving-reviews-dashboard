from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_hostaway_reviews():
    res = client.get("/api/reviews/hostaway")
    assert res.status_code == 200
    data = res.json()
    assert "reviews" in data
    assert isinstance(data["reviews"], list)


def test_place_mapping_crud():
    # ensure no mapping exists
    listing = "Test Listing"
    res = client.get(f"/api/place-mapping?listing={listing}")
    assert res.status_code in (404, 200)

    # create mapping
    res = client.post("/api/place-mapping", json={"listing": listing, "place_id": "CH_FAKE"})
    assert res.status_code == 200
    assert res.json().get("ok") is True

    # retrieve mapping
    res = client.get(f"/api/place-mapping?listing={listing}")
    assert res.status_code == 200
    assert res.json().get("place_id") == "CH_FAKE"

    # delete mapping
    res = client.delete(f"/api/place-mapping?listing={listing}")
    assert res.status_code == 200
    assert res.json().get("ok") is True

    # confirm deletion
    res = client.get(f"/api/place-mapping?listing={listing}")
    assert res.status_code == 404
