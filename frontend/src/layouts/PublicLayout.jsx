import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? "light" : ""}`}>
      <img src="/favicon.svg" alt="" width="28" height="28" />
      <span>AutoCare</span>
    </Link>
  );
}

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);

  return (
    <div className="public">
      <header className="topnav">
        <div className="container topnav-inner">
          <Brand />
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            <span /> <span /> <span />
          </button>
          <nav className={`topnav-links ${open ? "open" : ""}`}>
            <NavLink to="/" end onClick={close}>Home</NavLink>
            <NavLink to="/about" onClick={close}>About us</NavLink>
            <NavLink to="/services" onClick={close}>Services</NavLink>
            <NavLink to="/contact" onClick={close}>Contact us</NavLink>
            {user ? (
              <>
                <Link className="btn primary sm" to={user.role === "admin" ? "/admin" : "/customer"} onClick={close}>
                  Open dashboard
                </Link>
                <button className="btn sm" onClick={async () => { await logout(); close(); navigate("/"); }}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="btn sm" to="/login" onClick={close}>Log in</Link>
                <Link className="btn primary sm" to="/register" onClick={close}>Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <Brand light />
            <p>Honest vehicle servicing with live progress tracking.</p>
          </div>
          <div>
            <h4>Visit</h4>
            <p>42 Workshop Lane, Bengaluru</p>
            <p>Mon-Sat, 9:00 AM - 6:00 PM</p>
          </div>
          <div>
            <h4>Staff</h4>
            <Link to="/admin/login">Admin login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
