export type Review = {
  id: number;
  listing: string;
  type?: string;
  channel?: string;
  date?: string;
  reviewText?: string;
  categories?: Record<string, number>;
  rating?: number;
  status?: string;
  guestName?: string;
};

// Use Vite env var VITE_API_BASE. When empty string, requests use relative `/api/*` so
// you can configure Vercel rewrites to proxy to the backend. Locally VITE_API_BASE
// can be unset to default to 'http://127.0.0.1:8000'.
const VITE_BASE = typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE as string);
const BASE = VITE_BASE === undefined ? 'http://127.0.0.1:8000' : (VITE_BASE || '');

async function fetchJson(path: string, opts?: RequestInit) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchHostaway() {
  return fetchJson('/api/reviews/hostaway');
}

export async function fetchApproved() {
  return fetchJson('/api/reviews/approved');
}

export async function fetchApprovedWithTs() {
  return fetchJson('/api/reviews/approved-with-ts');
}

export async function postApprove(payload: Array<{id:number, approved:boolean}>) {
  return fetchJson('/api/reviews/approve', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
}
