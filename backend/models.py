from pydantic import BaseModel, Field, validator
from typing import Dict, Optional
from datetime import datetime


class ReviewCategory(BaseModel):
    category: str
    rating: int


class Review(BaseModel):
    id: int
    listing: str
    type: Optional[str]
    channel: Optional[str]
    date: Optional[str]
    reviewText: Optional[str]
    categories: Dict[str, int] = Field(default_factory=dict)
    rating: Optional[int]
    status: Optional[str]
    guestName: Optional[str]

    @validator("date", pre=True, always=True)
    def normalize_date(cls, v):
        if not v:
            return None
        # Try to parse several common formats and return ISO-8601
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%b %d, %Y",):
            try:
                dt = datetime.strptime(v, fmt)
                return dt.isoformat()
            except Exception:
                continue
        # Fallback: return original
        try:
            # If it's an int timestamp
            ts = int(v)
            return datetime.utcfromtimestamp(ts).isoformat()
        except Exception:
            return v
