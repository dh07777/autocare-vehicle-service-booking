import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { DataState, EmptyState } from "../../components/ui";
import { money } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export default function ServicesPage() {
  const { data, loading, error, reload } = useFetch("/services");
  const { user } = useAuth();
  const services = data?.services || [];
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h1>Services and prices</h1>
          <p className="muted">Prices are estimates. The final charge is confirmed by the workshop after inspection.</p>
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={services.length === 0 && <EmptyState title="No services listed yet" text="Please check back soon." />}>
          <div className="grid auto">
            {services.map((s) => (
              <div className="card" key={s.id}>
                <div className="row between">
                  <h3>{s.name}</h3>
                  <strong>{money(s.price)}</strong>
                </div>
                <p className="muted">{s.description}</p>
                <span className="badge info">About {s.duration_minutes} min</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link className="btn primary" to={user?.role === "customer" ? "/customer/book" : "/register"}>
              {user?.role === "customer" ? "Book a service" : "Create an account to book"}
            </Link>
          </div>
        </DataState>
      </div>
    </section>
  );
}
