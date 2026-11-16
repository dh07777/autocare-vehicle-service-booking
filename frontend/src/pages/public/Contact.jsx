import { useState } from "react";
import api, { errorMessage, fieldErrors } from "../../services/api";
import { Input, Textarea } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

const EMPTY = { name: "", email: "", subject: "", message: "" };

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await api.post("/contact", form);
      toast.success(res.data.message);
      setForm(EMPTY);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="container grid cols-2">
        <div>
          <h1>Contact us</h1>
          <p className="muted">Questions about a quote or a booking? Send a message and we will reply within one business day.</p>
          <p><strong>Address</strong><br />42 Workshop Lane, Bengaluru</p>
          <p><strong>Phone</strong><br />555-0100</p>
          <p><strong>Hours</strong><br />Mon-Sat, 9:00 AM - 6:00 PM</p>
        </div>
        <form className="card form" onSubmit={submit} noValidate>
          <Input label="Your name" name="name" value={form.name} onChange={set} error={errors.name} />
          <Input label="Email" type="email" name="email" value={form.email} onChange={set} error={errors.email} />
          <Input label="Subject" name="subject" value={form.subject} onChange={set} error={errors.subject} />
          <Textarea label="Message" name="message" value={form.message} onChange={set} error={errors.message} />
          <button className="btn primary" disabled={busy}>{busy ? "Sending..." : "Send message"}</button>
        </form>
      </div>
    </section>
  );
}
