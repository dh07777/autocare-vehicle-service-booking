import { Link } from "react-router-dom";
import Tracker from "../../components/Tracker";
import { useAuth } from "../../context/AuthContext";

const FEATURES = [
  ["Book in a minute", "Pick your vehicle, the service and a free time slot. Slots that are taken are greyed out, so there is no back and forth."],
  ["Follow every step", "From booking confirmed to delivered, you see the status of your car as the workshop updates it."],
  ["One service history", "Every job, technician and cost is kept against your vehicle so you always know what was done."],
  ["Clear invoices", "Itemised charges, simple payments and a PDF invoice you can download whenever you need it."],
];

export default function Home() {
  const { user } = useAuth();
  const cta = user ? (user.role === "admin" ? "/admin" : "/customer/book") : "/register";
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <h1>Know exactly where your car is in its service.</h1>
            <p>AutoCare lets you book a slot, watch the work move step by step and pay online. No phone calls to ask if it is ready.</p>
            <div className="row">
              <Link className="btn primary" to={cta}>{user ? "Book a service" : "Create a free account"}</Link>
              <Link className="btn ghost-light" to="/services">See services and prices</Link>
            </div>
          </div>
          <div className="hero-card" aria-label="Example of the service tracker">
            <div className="row between" style={{ marginBottom: 14 }}>
              <strong>Example booking</strong>
              <span className="badge info">Inspection</span>
            </div>
            <Tracker status="Inspection" step={2} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Everything about your service in one place</h2>
            <p className="muted">Built for drivers who want clear answers and workshops that want fewer interruptions.</p>
          </div>
          <div className="grid cols-4">
            {FEATURES.map(([title, text], i) => (
              <div className="feature" key={title}>
                <div className="num">{i + 1}</div>
                <h3>{title}</h3>
                <p className="muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container row between">
          <div>
            <h2>Ready for your next service?</h2>
            <p className="muted">Create an account, add your vehicle and pick a time that suits you.</p>
          </div>
          <Link className="btn primary" to={cta}>{user ? "Book a service" : "Get started"}</Link>
        </div>
      </section>
    </>
  );
}
