import React, { useEffect, useState } from "react";

interface Review {
  id: number;
  listing: string;
  type: string;
  channel: string;
  date: string;
  reviewText: string;
  categories: Record<string, number>;
  rating: number;
  status: string;
  guestName: string;
  displayOnWebsite?: boolean;
}

interface PropertyReviewsProps {
  listingName: string;
}

const PropertyReviews: React.FC<PropertyReviewsProps> = ({ listingName }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedIds, setApprovedIds] = useState<Record<number, boolean>>({});
  const [previewPublic, setPreviewPublic] = useState(false);
  const [placeId, setPlaceId] = useState<string>("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const [res, approvedRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/reviews/hostaway"),
          fetch("http://127.0.0.1:8000/api/reviews/approved"),
        ]);
        const data = await res.json();
        const approvedData = await approvedRes.json();

        const filtered = data.reviews.filter(
          (r: Review) => r.listing === listingName
        );

        const approvedMap: Record<number, boolean> = {};
        if (approvedData && Array.isArray(approvedData.approved)) {
          for (const id of approvedData.approved) approvedMap[id] = true;
        }

        setApprovedIds(approvedMap);
        setReviews(filtered);
      } catch (error) {
        console.error("Failed to fetch reviews", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();

    // load place mapping for this listing
    (async () => {
      try {
        const mapRes = await fetch(
          `/api/place-mapping?listing=${encodeURIComponent(listingName)}`
        );
        if (mapRes.ok) {
          const m = await mapRes.json();
          if (m.place_id) {
            setPlaceId(m.place_id);
            // auto-fetch google reviews for mapped place
            // reuse existing fetch logic
            const gres = await fetch(
              `/api/reviews/google?place_id=${encodeURIComponent(m.place_id)}`
            );
            if (gres.ok) {
              const gd = await gres.json();
              setReviews((prev) => [...gd.reviews, ...prev]);
            }
          }
        }
      } catch (e) {
        // ignore mapping errors
      }
    })();
  }, [listingName]);

  if (loading)
    return (
      <div
        style={{
          padding: 20,
          fontFamily: "Arial, sans-serif",
          color: "#eee",
          background: "#222",
        }}
      >
        Loading reviews...
      </div>
    );

  const visibleReviews = reviews.filter((r) =>
    previewPublic ? true : Boolean(approvedIds[r.id])
  );

  if (visibleReviews.length === 0)
    return (
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          padding: 20,
          background: "#111",
          color: "#ddd",
        }}
      >
        <h2 style={{ color: "#fff" }}>Guest Reviews for {listingName}</h2>
        <p style={{ color: "#bbb" }}>
          No approved reviews found for {listingName}.
        </p>
        <p style={{ color: "#bbb" }}>
          Managers can approve reviews in the main dashboard. Toggle Preview to
          see all reviews.
        </p>
        <button
          onClick={() => setPreviewPublic(true)}
          style={{
            background: "#333",
            color: "#fff",
            border: "1px solid #444",
            padding: "8px 12px",
          }}
        >
          Preview All
        </button>
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: 20,
        background: "#111",
        color: "#eee",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ color: "#fff" }}>Guest Reviews for {listingName}</h2>
        <div>
          <button
            onClick={() => setPreviewPublic((s) => !s)}
            style={{
              background: "#333",
              color: "#fff",
              border: "1px solid #444",
              padding: "8px 12px",
            }}
          >
            {previewPublic ? "Hide Preview" : "Preview All"}
          </button>
        </div>
      </div>

      {visibleReviews.map((review) => (
        <div
          key={review.id}
          style={{
            border: "1px solid #2b2b2b",
            padding: 15,
            marginBottom: 10,
            borderRadius: 6,
            backgroundColor: "#1a1a1a",
            color: "#eaeaea",
          }}
        >
          <p>
            <strong style={{ color: "#fff" }}>Guest:</strong>{" "}
            <span style={{ color: "#cfe2ff" }}>{review.guestName}</span>
          </p>
          <p style={{ color: "#ddd" }}>{review.reviewText}</p>
          <p style={{ color: "#bbb" }}>
            <strong>Rating:</strong> {review.rating} | <strong>Channel:</strong>{" "}
            {review.channel} | <strong>Date:</strong> {review.date}
          </p>
          <p style={{ color: "#bbb" }}>
            <strong>Categories:</strong>{" "}
            {Object.entries(review.categories)
              .map(([cat, rate]) => `${cat} (${rate})`)
              .join(", ")}
          </p>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <h3 style={{ color: "#fff" }}>Google Reviews</h3>
        <p style={{ color: "#bbb" }}>
          If you have a Google Place ID for this property you can fetch Google
          Reviews and preview them here.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {placeId ? (
            <div style={{ color: "#cfe2ff", marginRight: 8 }}>
              Mapped Place ID: <strong style={{ color: "#fff" }}>{placeId}</strong>
            </div>
          ) : null}
          <input
            placeholder="Enter Google Place ID"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            style={{
              padding: 8,
              minWidth: 320,
              background: "#222",
              color: "#eee",
              border: "1px solid #333",
            }}
          />
          {placeId ? (
            <button
              onClick={async () => {
                setGoogleLoading(true);
                try {
                  const res = await fetch(
                    `/api/reviews/google?place_id=${encodeURIComponent(placeId)}`
                  );
                  if (!res.ok) {
                    const err = await res.json();
                    alert(`Failed: ${err.detail || res.statusText}`);
                  } else {
                    const data = await res.json();
                    setReviews((prev) => [...data.reviews, ...prev]);
                  }
                } catch (e) {
                  console.error(e);
                  alert("Error fetching Google reviews");
                } finally {
                  setGoogleLoading(false);
                }
              }}
              style={{
                background: "#333",
                color: "#fff",
                border: "1px solid #444",
                padding: "8px 12px",
              }}
            >
              {googleLoading ? "Loading…" : "Fetch mapped Google Reviews"}
            </button>
          ) : null}
          <button
            onClick={async () => {
              if (!placeId) return;
              setGoogleLoading(true);
              try {
                const res = await fetch(
                  `/api/reviews/google?place_id=${encodeURIComponent(placeId)}`
                );
                if (!res.ok) {
                  const err = await res.json();
                  alert(`Failed: ${err.detail || res.statusText}`);
                } else {
                  const data = await res.json();
                  // Merge google reviews into the displayed reviews (preview only)
                  setReviews((prev) => [...data.reviews, ...prev]);
                }
              } catch (e) {
                console.error(e);
                alert("Error fetching Google reviews");
              } finally {
                setGoogleLoading(false);
              }
            }}
            style={{
              background: "#333",
              color: "#fff",
              border: "1px solid #444",
              padding: "8px 12px",
            }}
          >
            {googleLoading ? "Loading…" : "Fetch Google Reviews"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyReviews;
