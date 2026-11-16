export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

export const fmtDate = (iso) => {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

export const fmtTime = (slot) => {
  if (!slot) return "";
  const [h, m] = slot.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const STEPS = ["Booking Confirmed", "Vehicle Received", "Inspection", "Service in Progress", "Service Completed", "Delivered"];
export const ALL_STATUSES = ["Pending", ...STEPS, "Rejected", "Cancelled"];

export const statusTone = (s) =>
  ({
    Pending: "warn",
    "Booking Confirmed": "info",
    "Vehicle Received": "info",
    Inspection: "info",
    "Service in Progress": "info",
    "Service Completed": "ok",
    Delivered: "ok",
    Rejected: "bad",
    Cancelled: "bad",
    Paid: "ok",
    Unpaid: "warn",
    Success: "ok",
  }[s] || "info");
