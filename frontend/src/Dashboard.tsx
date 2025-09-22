import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import PropertyReviews from "./components/PropertyReviews";
import ReviewCard from "./components/ReviewCard";

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
// Approvals are stored server-side; no localStorage authoritative cache

const Dashboard: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedMap, setApprovedMap] = useState<Record<number, boolean>>({});
  const [approvedTsMap, setApprovedTsMap] = useState<Record<number, number>>(
    {}
  );

  // Filters
  const [filterListing, setFilterListing] = useState<string>("All");
  const [filterChannel, setFilterChannel] = useState<string>("All");
  const [filterRating, setFilterRating] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("date");

  useEffect(() => {
    async function fetchReviews() {
      try {
        // Fetch hostaway reviews and server-approved IDs + timestamps in parallel
        const [res, approvedRes, approvedTsResRaw] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/reviews/hostaway"),
          fetch("http://127.0.0.1:8000/api/reviews/approved"),
          fetch("http://127.0.0.1:8000/api/reviews/approved-with-ts"),
        ]);

        const data = res.ok ? await res.json() : { reviews: [] };
        const approvedData = approvedRes.ok
          ? await approvedRes.json()
          : { approved: [] };
        const approvedTsRes = approvedTsResRaw.ok
          ? await approvedTsResRaw.json()
          : { approved: [] };

        // Build approved map from server (server is source-of-truth)
        const serverApprovedMap: Record<number, boolean> = {};
        if (approvedData && Array.isArray(approvedData.approved)) {
          for (const id of approvedData.approved) serverApprovedMap[id] = true;
        }

        const tsMap: Record<number, number> = {};
        if (Array.isArray(approvedTsRes.approved)) {
          for (const entry of approvedTsRes.approved) {
            tsMap[entry.id] = entry.updated_at;
            serverApprovedMap[entry.id] = true;
          }
        }

        setReviews(
          (data.reviews || []).map((r: Review) => ({
            ...r,
            displayOnWebsite: serverApprovedMap[r.id] || false,
          }))
        );

        setApprovedMap(serverApprovedMap);
        setApprovedTsMap(tsMap);
      } catch (e) {
        console.error("Failed to fetch reviews", e);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, []);

  const propertyStats = computePropertyStats(reviews);

  // Chart dataset for property average ratings
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  );
  const chartData = {
    labels: propertyStats.map((p) => p.listing),
    datasets: [
      {
        label: "Average Rating",
        data: propertyStats.map((p) => parseFloat(p.averageRating.toFixed(2))),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: false },
    },
    scales: {
      y: { min: 0, max: 10 },
    },
  };

  // Selected property for detail panel
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const listings = Array.from(new Set(reviews.map((r) => r.listing)));
  const channels = Array.from(new Set(reviews.map((r) => r.channel)));
  const ratings = Array.from(
    new Set(reviews.map((r) => r.rating.toString()))
  ).sort();
  const categories = Array.from(
    new Set(reviews.flatMap((r) => Object.keys(r.categories || {})))
  );

  const filteredReviews = reviews.filter((review) => {
    if (filterListing !== "All" && review.listing !== filterListing)
      return false;
    if (filterChannel !== "All" && review.channel !== filterChannel)
      return false;
    if (filterRating !== "All" && review.rating.toString() !== filterRating)
      return false;
    if (filterCategory !== "All") {
      const catVal = review.categories && review.categories[filterCategory];
      if (typeof catVal === "undefined") return false;
    }
    return true;
  });

  // Sorting
  if (sortBy === "rating") {
    filteredReviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    // sort by date desc by default
    filteredReviews.sort((a, b) =>
      b.date > a.date ? 1 : b.date < a.date ? -1 : 0
    );
  }

  // Toggle approval and sync to server; optimistic UI and server refresh
  const toggleDisplay = async (id: number) => {
    const nextState = !approvedMap[id];
    // optimistic UI update
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, displayOnWebsite: nextState } : r))
    );

    try {
      await fetch("http://127.0.0.1:8000/api/reviews/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ id, approved: nextState }]),
      });
      // refresh approvals from server
      const aprovedRes = await fetch(
        "http://127.0.0.1:8000/api/reviews/approved"
      );
      if (aprovedRes.ok) {
        const aprovedJson = await aprovedRes.json();
        const refreshed: Record<number, boolean> = {};
        if (aprovedJson && Array.isArray(aprovedJson.approved)) {
          for (const aid of aprovedJson.approved) refreshed[aid] = true;
        }
        const finalMap =
          Object.keys(refreshed).length > 0
            ? refreshed
            : { ...approvedMap, [id]: nextState };
        setApprovedMap(finalMap);
        // server is source of truth; no local cache write
        setReviews((prev) =>
          prev.map((r) => ({ ...r, displayOnWebsite: finalMap[r.id] || false }))
        );
      }
    } catch (error) {
      console.error("Failed to update approval", error);
      // revert optimistic update on failure
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, displayOnWebsite: approvedMap[id] || false } : r
        )
      );
    }
  };
  const [placeMapInput, setPlaceMapInput] = useState<string>("");

  // Prefill place mapping input when a property is selected
  useEffect(() => {
    if (!selectedProperty) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/place-mapping?listing=${encodeURIComponent(selectedProperty)}`
        );
        if (res.ok) {
          const data = await res.json();
          setPlaceMapInput(data.place_id || "");
        } else {
          setPlaceMapInput("");
        }
      } catch (e) {
        setPlaceMapInput("");
      }
    })();
  }, [selectedProperty]);

  if (loading) return <div>Loading...</div>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Property Reviews Dashboard
      </Typography>

      <section>
        <h2>Properties Overview</h2>
        <div style={{ maxWidth: 800 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>

        <ul>
          {propertyStats.map(({ listing, averageRating, reviewCount }) => (
            <li key={listing} style={{ marginTop: 8 }}>
              <button
                onClick={() => setSelectedProperty(listing)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1976d2",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {listing}
              </button>
              : Avg Rating: {averageRating.toFixed(1)} ({reviewCount} reviews)
            </li>
          ))}
        </ul>
      </section>

      <Box sx={{ my: 2 }}>
        <Typography variant="h6">Filters</Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Property</InputLabel>
            <Select
              value={filterListing}
              label="Property"
              onChange={(e) => setFilterListing(e.target.value)}
            >
              <MenuItem value={"All"}>All</MenuItem>
              {listings.map((l) => (
                <MenuItem key={l} value={l}>
                  {l}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Channel</InputLabel>
            <Select
              value={filterChannel}
              label="Channel"
              onChange={(e) => setFilterChannel(e.target.value)}
            >
              <MenuItem value={"All"}>All</MenuItem>
              {channels.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Rating</InputLabel>
            <Select
              value={filterRating}
              label="Rating"
              onChange={(e) => setFilterRating(e.target.value)}
            >
              <MenuItem value={"All"}>All</MenuItem>
              {ratings.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filterCategory}
              label="Category"
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value={"All"}>All</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={sortBy}
              label="Sort"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value={"date"}>Date</MenuItem>
              <MenuItem value={"rating"}>Rating</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <section style={{ marginTop: 20 }}>
        <h2>Reviews</h2>
        {filteredReviews.length === 0 && (
          <p>No reviews match the current filters.</p>
        )}
        {filteredReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            approvedAt={approvedTsMap[review.id]}
            onToggle={toggleDisplay}
          />
        ))}
      </section>

      {selectedProperty && (
        <section style={{ marginTop: 24, borderTop: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2>Property Details - {selectedProperty}</h2>
            <button onClick={() => setSelectedProperty(null)}>Close</button>
          </div>
          <div
            style={{
              margin: "12px 0",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              placeholder="Google Place ID (optional)"
              value={placeMapInput}
              onChange={(e) => setPlaceMapInput(e.target.value)}
              style={{ padding: 8, minWidth: 320 }}
            />
            <button
              onClick={async () => {
                if (!placeMapInput) return alert("Enter a Place ID to save");
                try {
                  const res = await fetch(`/api/place-mapping`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      listing: selectedProperty,
                      place_id: placeMapInput,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    alert(
                      `Failed to save mapping: ${err.detail || res.statusText}`
                    );
                  } else {
                    alert("Place ID mapping saved");
                  }
                } catch (e) {
                  console.error(e);
                  alert("Error saving place mapping");
                }
              }}
            >
              Save Mapping
            </button>
            <button
              onClick={async () => {
                if (!selectedProperty) return;
                try {
                  const res = await fetch(
                    `/api/place-mapping?listing=${encodeURIComponent(
                      selectedProperty
                    )}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (!res.ok) {
                    const err = await res.json();
                    alert(
                      `Failed to remove mapping: ${
                        err.detail || res.statusText
                      }`
                    );
                  } else {
                    alert("Place ID mapping removed");
                    setPlaceMapInput("");
                  }
                } catch (e) {
                  console.error(e);
                  alert("Error removing mapping");
                }
              }}
              style={{ marginLeft: 6 }}
            >
              Remove Mapping
            </button>
          </div>

          <PropertyReviews listingName={selectedProperty} />
        </section>
      )}
    </Box>
  );
};

export default Dashboard;
