import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { fieldErrors, errorMessage } from "../../services/api";
import { Input } from "../../components/ui";

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm_password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/customer"} replace />;
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setErrors({ confirm_password: "Passwords do not match." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await register(form);
      toast.success("Account created. Welcome to AutoCare!");
      navigate("/customer");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card wide form two" onSubmit={submit} noValidate>
        <div className="span-2">
          <h1>Create your account</h1>
          <p className="muted">Add your vehicles and book services in minutes.</p>
        </div>
        <div className="span-2"><Input label="Full name" name="name" value={form.name} onChange={set} error={errors.name} autoComplete="name" /></div>
        <Input label="Email" type="email" name="email" value={form.email} onChange={set} error={errors.email} autoComplete="email" />
        <Input label="Phone number" type="tel" name="phone" value={form.phone} onChange={set} error={errors.phone} autoComplete="tel" />
        <Input label="Password" type="password" name="password" value={form.password} onChange={set} error={errors.password} hint="At least 8 characters with a letter and a number." autoComplete="new-password" />
        <Input label="Confirm password" type="password" name="confirm_password" value={form.confirm_password} onChange={set} error={errors.confirm_password} autoComplete="new-password" />
        <button className="btn primary span-2" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
        <p className="span-2 muted" style={{ margin: 0 }}>Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
