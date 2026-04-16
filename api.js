// ============================================================
// SIAM ROYAL JOURNEY — Frontend API Client
// Save as: frontend/api.js  (import in your main JS)
// ============================================================

const API_BASE = 'https://api.yourdomain.com'; // ← change to your backend URL
const ADMIN_KEY = ''; // ← set via secure env, NOT hardcoded in production

// ── Helpers ───────────────────────────────────────────────────
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function adminHeaders() {
  return { 'x-admin-key': ADMIN_KEY };
}

// ════════════════════════════════════════════════════════════
// PACKAGES
// ════════════════════════════════════════════════════════════
export const PackageAPI = {
  getAll: () => request('/api/packages'),
  getById: (id) => request(`/api/packages/${id}`),
};

// ════════════════════════════════════════════════════════════
// BOOKINGS
// ════════════════════════════════════════════════════════════
export const BookingAPI = {
  create: (payload) => request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  track: (ref) => request(`/api/bookings/track/${ref}`),
};

// ════════════════════════════════════════════════════════════
// PAYMENT
// ════════════════════════════════════════════════════════════
export const PaymentAPI = {
  // Credit/Debit card via Omise.js token
  chargeCard: (bookingRef, omiseToken) => request('/api/payment/charge', {
    method: 'POST',
    body: JSON.stringify({ booking_ref: bookingRef, token: omiseToken, method: 'card' }),
  }),

  // PromptPay / QR Code
  chargePromptPay: (bookingRef) => request('/api/payment/charge', {
    method: 'POST',
    body: JSON.stringify({ booking_ref: bookingRef, method: 'promptpay' }),
  }),

  // Bank transfer (manual) — just flags the booking
  bankTransfer: (bookingRef) => request('/api/payment/bank-transfer', {
    method: 'POST',
    body: JSON.stringify({ booking_ref: bookingRef }),
  }),
};

// ════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════
export const AdminAPI = {
  getStats: () => request('/api/admin/stats', {
    headers: adminHeaders(),
  }),

  getBookings: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/bookings?${q}`, { headers: adminHeaders() });
  },

  updateBooking: (id, payload) => request(`/api/admin/bookings/${id}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  }),

  addPackage: (payload) => request('/api/admin/packages', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  }),

  updatePackage: (id, payload) => request(`/api/admin/packages/${id}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  }),
};

// ════════════════════════════════════════════════════════════
// OMISE PAYMENT HELPERS (frontend)
// ════════════════════════════════════════════════════════════

// Load Omise.js from CDN then call this to create a token
export function loadOmiseScript(publicKey) {
  return new Promise((resolve, reject) => {
    if (window.Omise) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.omise.co/omise.js';
    s.onload = () => { window.OmiseCard.configure({ publicKey }); resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Open Omise card popup and return token
export function openOmiseCard(amount) {
  return new Promise((resolve, reject) => {
    window.OmiseCard.open({
      amount,
      currency: 'THB',
      defaultPaymentMethod: 'credit_card',
      onCreateTokenSuccess: resolve,
      onFormClosed: () => reject(new Error('Card form closed')),
    });
  });
}

// ════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ════════════════════════════════════════════════════════════
/*

// 1. Load packages
const packages = await PackageAPI.getAll();

// 2. Create booking
const booking = await BookingAPI.create({
  package_id: 'uuid-here',
  travel_date: '2026-05-15',
  guests: 2,
  first_name: 'Somchai',
  last_name: 'Raksa',
  email: 'somchai@email.com',
  phone: '+66812345678',
  nationality: 'Thai',
  hotel: 'Mandarin Oriental Bangkok',
  preferred_contact: 'LINE',
  language: 'th',
});
console.log(booking.ref); // SRJ-2026-AB12C

// 3a. Pay by card
await loadOmiseScript(OMISE_PUBLIC_KEY);
const token = await openOmiseCard(booking.deposit_amount * 100);
const payment = await PaymentAPI.chargeCard(booking.ref, token);

// 3b. Pay by PromptPay
const qr = await PaymentAPI.chargePromptPay(booking.ref);
showQRImage(qr.qr_image); // display QR to user

// 3c. Bank transfer
await PaymentAPI.bankTransfer(booking.ref);

// 4. Track booking
const status = await BookingAPI.track('SRJ-2026-AB12C');
console.log(status.status); // confirmed

// Admin
const stats = await AdminAPI.getStats();
const { data } = await AdminAPI.getBookings({ status: 'pending', page: 1 });
await AdminAPI.updateBooking(id, { status: 'confirmed' });

*/
