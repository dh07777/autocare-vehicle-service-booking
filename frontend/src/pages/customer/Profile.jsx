import { useState } from "react";
import api, { errorMessage, fieldErrors } from "../../services/api";
import { Input, PageHeader } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// Shared by the customer profile page and the admin profile page.
export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone });
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [errors, setErrors] = useState({});
  const [pwErrors, setPwErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await api.put("/auth/profile", form);
      setUser(res.data.user);
      toast.success("Profile updated.");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwBusy(true);
    setPwErrors({});
    try {
      await api.put("/auth/password", pw);
      toast.success("Password changed.");
      setPw({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPwErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle={user.role === "admin" ? "Administrator account" : "Your contact details and password."} />
      <div className="grid cols-2">
        <form className="card form" onSubmit={saveProfile} noValidate>
          <h2>Contact details</h2>
          <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <Input label="Phone number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
          <div><button className="btn primary" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button></div>
        </form>
        <form className="card form" onSubmit={savePassword} noValidate>
          <h2>Change password</h2>
          <Input label="Current password" type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} error={pwErrors.current_password} autoComplete="current-password" />
          <Input label="New password" type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} error={pwErrors.new_password} autoComplete="new-password" />
          <Input label="Confirm new password" type="password" value={pw.confirm_password} onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })} error={pwErrors.confirm_password} autoComplete="new-password" />
          <div><button className="btn primary" disabled={pwBusy}>{pwBusy ? "Updating..." : "Update password"}</button></div>
        </form>
      </div>
    </>
  );
}
