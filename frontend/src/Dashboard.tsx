import React, { useEffect, useState } from "react";

export interface Review {
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

type PropertyStats = {
  listing: string;
  averageRating: number;
  reviewCount: number;
};

const computePropertyStats = (reviews: Review[]): PropertyStats[] => {
  const map = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const { listing, rating } = review;
    if (!map.has(listing)) {
      map.set(listing, { sum: rating || 0, count: rating ? 1 : 0 });
    } else {
      const cur = map.get(listing)!;
      if (rating) {
        cur.sum += rating;
        cur.count += 1;
      }
      map.set(listing, cur);
    }
  }
  return Array.from(map.entries()).map(([listing, { sum, count }]) => ({
    listing,
    averageRating: count === 0 ? 0 : sum / count,
    reviewCount: count,
  }));
};
const LOCAL_STORAGE_KEY = "approvedReviews";

// Helper to load approved review IDs from localStorage
const loadApprovedFromStorage = (): Record<number, boolean> => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse issues
  }
  return {};
};

// Helper to save approved review IDs to localStorage
const saveApprovedToStorage = (approvedMap: Record<number, boolean>) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(approvedMap));
};

const Dashboard: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedMap, setApprovedMap] = useState<Record<number, boolean>>({});

  // Filters
  const [filterListing, setFilterListing] = useState<string>("All");
  const [filterChannel, setFilterChannel] = useState<string>("All");
  const [filterRating, setFilterRating] = useState<string>("All");

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/reviews/hostaway");
        const data = await res.json();

        // Load approvals from localStorage
        const storedApprovals = loadApprovedFromStorage();

        setReviews(
          data.reviews.map((r: Review) => ({
            ...r,
            displayOnWebsite: storedApprovals[r.id] || false,
          }))
        );

        setApprovedMap(storedApprovals);
      } catch (e) {
        console.error("Failed to fetch reviews", e);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, []);

  const propertyStats = computePropertyStats(reviews);

  const listings = Array.from(new Set(reviews.map((r) => r.listing)));
  const channels = Array.from(new Set(reviews.map((r) => r.channel)));
  const ratings = Array.from(
    new Set(reviews.map((r) => r.rating.toString()))
  ).sort();

  const filteredReviews = reviews.filter((review) => {
    if (filterListing !== "All" && review.listing !== filterListing)
      return false;
    if (filterChannel !== "All" && review.channel !== filterChannel)
      return false;
    if (filterRating !== "All" && review.rating.toString() !== filterRating)
      return false;
    return true;
  });

  // Toggle approval and sync to localStorage
  const toggleDisplay = async (id: number) => {
    const newState = !approvedMap[id];
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, displayOnWebsite: newState } : r))
    );
    setApprovedMap((prev) => ({ ...prev, [id]: newState }));

    try {
      await fetch("http://127.0.0.1:8000/api/reviews/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ id, approved: newState }]),
      });
    } catch (error) {
      console.error("Failed to update approval", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Property Reviews Dashboard</h1>

      <section>
        <h2>Properties Overview</h2>
        <ul>
          {propertyStats.map(({ listing, averageRating, reviewCount }) => (
            <li key={listing}>
              {listing}: Avg Rating: {averageRating.toFixed(1)} ({reviewCount}{" "}
              reviews)
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Filters</h2>
        <label>
          Property:
          <select
            value={filterListing}
            onChange={(e) => setFilterListing(e.target.value)}
          >
            <option>All</option>
            {listings.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: 20 }}>
          Channel:
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
          >
            <option>All</option>
            {channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: 20 }}>
          Rating:
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option>All</option>
            {ratings.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Reviews</h2>
        {filteredReviews.length === 0 && (
          <p>No reviews match the current filters.</p>
        )}
        {filteredReviews.map((review) => (
          <div
            key={review.id}
            style={{
              border: "1px solid #ccc",
              padding: 15,
              marginBottom: 10,
              borderRadius: 4,
              background: review.displayOnWebsite ? "#e0f7fa" : "#fff",
              color: "#222",
            }}
          >
            <h3 style={{ fontWeight: 700 }}>{review.listing}</h3>
            <p>
              <strong>Guest:</strong> {review.guestName}
            </p>
            <p>{review.reviewText}</p>
            <p>
              <strong>Rating:</strong> {review.rating} |{" "}
              <strong>Channel:</strong> {review.channel} |{" "}
              <strong>Date:</strong> {review.date}
            </p>
            <p>
              <strong>Categories:</strong>{" "}
              {Object.entries(review.categories)
                .map(([cat, rate]) => `${cat} (${rate})`)
                .join(", ")}
            </p>
            <label>
              <input
                type="checkbox"
                checked={review.displayOnWebsite || false}
                onChange={() => toggleDisplay(review.id)}
              />{" "}
              Display on Website
            </label>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
