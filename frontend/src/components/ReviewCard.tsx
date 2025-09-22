import React from "react";
import type { Review } from "../api";
import { Box, Typography } from "@mui/material";

interface Props {
  review: Review;
  approvedAt?: number;
  onToggle: (id: number) => void;
}

const ReviewCard: React.FC<Props> = ({ review, approvedAt, onToggle }) => {
  const checked = Boolean(approvedAt);
  return (
    <Box
      sx={{
        border: "1px solid #ccc",
        p: 2,
        mb: 2,
        borderRadius: 1,
        background: checked ? "#e8f5e9" : "#fff",
      }}
    >
      <Typography variant="h6">{review.listing}</Typography>
      <Typography>
        <strong>Guest:</strong> {review.guestName}
      </Typography>
      <Typography>{review.reviewText}</Typography>
      <Typography variant="body2">
        <strong>Rating:</strong> {review.rating ?? "—"} |{" "}
        <strong>Channel:</strong> {review.channel ?? "—"} |{" "}
        <strong>Date:</strong> {review.date ?? "—"}
      </Typography>
      <Typography variant="body2">
        <strong>Categories:</strong>{" "}
        {review.categories
          ? Object.entries(review.categories)
              .map(([k, v]) => `${k} (${v})`)
              .join(", ")
          : "—"}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(review.id)}
          />{" "}
          Approved
        </label>
        {approvedAt ? (
          <Typography variant="caption" sx={{ color: "#666" }}>
            Approved: {new Date(approvedAt * 1000).toLocaleString()}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default ReviewCard;
