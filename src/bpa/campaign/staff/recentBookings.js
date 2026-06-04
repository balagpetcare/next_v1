const KEY = "bpa_campaign_recent";

export function trackRecentBooking(bookingRef, meta = {}) {
  if (typeof window === "undefined" || !bookingRef) return;
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    const entry = {
      bookingRef,
      ownerName: meta.ownerName || "",
      updatedAt: new Date().toISOString(),
      status: meta.status || "",
    };
    const filtered = list.filter((x) => x.bookingRef !== bookingRef);
    filtered.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export function loadRecentBookings() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
