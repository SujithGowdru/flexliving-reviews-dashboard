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

export async function fetchHostaway() {
  const res = await fetch('http://127.0.0.1:8000/api/reviews/hostaway');
  if (!res.ok) throw new Error('Failed to fetch hostaway');
  return res.json();
}

export async function fetchApproved() {
  const res = await fetch('http://127.0.0.1:8000/api/reviews/approved');
  if (!res.ok) throw new Error('Failed to fetch approved');
  return res.json();
}

export async function fetchApprovedWithTs() {
  const res = await fetch('http://127.0.0.1:8000/api/reviews/approved-with-ts');
  if (!res.ok) throw new Error('Failed to fetch approved-with-ts');
  return res.json();
}

export async function postApprove(
  payload: Array<{id:number, approved:boolean}>) {
  const res = await fetch('http://127.0.0.1:8000/api/reviews/approve', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  return res.json();
}
