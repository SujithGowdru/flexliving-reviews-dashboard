import sqlite3
import threading
import time
import json
from typing import Optional, List, Dict, Any


DB_PATH = "./reviews.db"


class DB:
    _lock = threading.Lock()

    def __init__(self, path: str = DB_PATH):
        self.path = path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute(
                """
            CREATE TABLE IF NOT EXISTS approvals (
                id INTEGER PRIMARY KEY,
                approved INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            """
            )
            cur.execute(
                """
            CREATE TABLE IF NOT EXISTS place_mappings (
                listing TEXT PRIMARY KEY,
                place_id TEXT
            )
            """
            )
            cur.execute(
                """
            CREATE TABLE IF NOT EXISTS google_cache (
                place_id TEXT PRIMARY KEY,
                payload TEXT,
                fetched_at INTEGER
            )
            """
            )
            conn.commit()
            conn.close()

    # Approvals
    def set_approval(self, id: int, approved: bool):
        ts = int(time.time())
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO approvals (id, approved, updated_at) VALUES (?, ?, ?)"
                " ON CONFLICT(id) DO UPDATE SET approved=excluded.approved, updated_at=excluded.updated_at",
                (id, 1 if approved else 0, ts),
            )
            conn.commit()
            conn.close()

    def list_approved(self) -> List[int]:
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute("SELECT id FROM approvals WHERE approved=1")
            rows = cur.fetchall()
            conn.close()
            return [r["id"] for r in rows]

    def list_approved_with_ts(self) -> List[Dict[str, int]]:
        """Return list of approved ids with updated_at timestamp (epoch seconds)."""
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute("SELECT id, updated_at FROM approvals WHERE approved=1")
            rows = cur.fetchall()
            conn.close()
            return [{"id": r["id"], "updated_at": r["updated_at"]} for r in rows]

    # Place mappings
    def set_place_mapping(self, listing: str, place_id: str):
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO place_mappings (listing, place_id) VALUES (?, ?)"
                " ON CONFLICT(listing) DO UPDATE SET place_id=excluded.place_id",
                (listing, place_id),
            )
            conn.commit()
            conn.close()

    def get_place_mapping(self, listing: str) -> Optional[str]:
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute("SELECT place_id FROM place_mappings WHERE listing=?", (listing,))
            row = cur.fetchone()
            conn.close()
            if row:
                return row["place_id"]
            return None

    def delete_place_mapping(self, listing: str):
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute("DELETE FROM place_mappings WHERE listing=?", (listing,))
            conn.commit()
            conn.close()

    # Google cache
    def set_google_cache(self, place_id: str, payload: str):
        ts = int(time.time())
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO google_cache (place_id, payload, fetched_at) VALUES (?, ?, ?)"
                " ON CONFLICT(place_id) DO UPDATE SET payload=excluded.payload, fetched_at=excluded.fetched_at",
                (place_id, payload, ts),
            )
            conn.commit()
            conn.close()

    def get_google_cache(self, place_id: str, ttl_seconds: int = 86400) -> Optional[Dict[str, Any]]:
        with self._lock:
            conn = self._get_conn()
            cur = conn.cursor()
            cur.execute("SELECT payload, fetched_at FROM google_cache WHERE place_id=?", (place_id,))
            row = cur.fetchone()
            conn.close()
            if not row:
                return None
            fetched_at = row["fetched_at"]
            if int(time.time()) - fetched_at > ttl_seconds:
                return None
            try:
                return json.loads(row["payload"])
            except Exception:
                return None


db = DB()
