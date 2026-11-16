import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../services/api";
import { Input } from "../../components/ui";

export default function Login({ portal = "customer" }) {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = portal === "admin";

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/customer"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const u = await login(form.email, form.password, portal);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}.`);
      navigate(location.state?.from?.pathname || (u.role === "admin" ? "/admin" : "/customer"), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card form" onSubmit={submit} noValidate>
        <div>
          <h1>{isAdmin ? "Admin login" : "Log in"}</h1>
          <p className="muted">{isAdmin ? "For AutoCare staff only." : "Access your vehicles, bookings and invoices."}</p>
        </div>
        {error && <div className="alert error" role="alert">{error}</div>}
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
        <button className="btn primary" disabled={busy}>{busy ? "Logging in..." : "Log in"}</button>
        {isAdmin ? (
          <p className="muted" style={{ margin: 0 }}>Customer? <Link to="/login">Use the customer login</Link></p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>New here? <Link to="/register">Create an account</Link></p>
        )}
      </form>
    </div>
  );
}
