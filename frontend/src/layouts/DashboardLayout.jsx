import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Brand } from "./PublicLayout";

const CUSTOMER_NAV = [
  ["/customer", "Dashboard", true],
  ["/customer/vehicles", "My vehicles"],
  ["/customer/book", "Book service"],
  ["/customer/appointments", "My appointments"],
  ["/customer/track", "Track service"],
  ["/customer/history", "Service history"],
  ["/customer/payments", "Payments"],
  ["/customer/profile", "Profile"],
];
const ADMIN_NAV = [
  ["/admin", "Dashboard", true],
  ["/admin/appointments", "Appointments"],
  ["/admin/customers", "Customers"],
  ["/admin/vehicles", "Vehicles"],
  ["/admin/services", "Services"],
  ["/admin/technicians", "Technicians"],
  ["/admin/reports", "Reports"],
  ["/admin/profile", "Profile"],
];

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const nav = role === "admin" ? ADMIN_NAV : CUSTOMER_NAV;

  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.success("You have been logged out.");
    navigate(role === "admin" ? "/admin/login" : "/login");
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Brand light />
        <span className="role-tag">{role === "admin" ? "Admin console" : "Customer portal"}</span>
        <nav>
          {nav.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="btn ghost-light" onClick={handleLogout}>
          Log out
        </button>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="menu-btn dark" onClick={() => setOpen(true)} aria-label="Open navigation">
            <span /> <span /> <span />
          </button>
          <span className="muted">Signed in as</span>
          <strong>{user?.name}</strong>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
