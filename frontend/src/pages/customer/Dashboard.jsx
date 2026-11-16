import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { DataState, EmptyState, PageHeader, StatCard, StatusBadge } from "../../components/ui";
import { fmtDate, fmtTime, money, todayISO } from "../../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const appts = useFetch("/appointments");
  const vehicles = useFetch("/vehicles");
  const loading = appts.loading || vehicles.loading;
  const error = appts.error || vehicles.error;
  const list = appts.data?.appointments || [];
  const completed = list.filter((a) => ["Service Completed", "Delivered"].includes(a.status));
  const upcoming = list
    .filter((a) => a.appointment_date >= todayISO() && !["Cancelled", "Rejected", "Delivered", "Service Completed"].includes(a.status))
    .sort((a, b) => (a.appointment_date + a.time_slot).localeCompare(b.appointment_date + b.time_slot))
    .slice(0, 5);

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} subtitle="Here is what is happening with your vehicles.">
        <Link className="btn primary" to="/customer/book">Book a service</Link>
      </PageHeader>
      <DataState loading={loading} error={error} onRetry={() => { appts.reload(); vehicles.reload(); }}>
        <div className="grid cols-4">
          <StatCard label="Registered vehicles" value={vehicles.data?.vehicles.length ?? 0} />
          <StatCard label="Total bookings" value={list.length} tone="amber" />
          <StatCard label="Pending appointments" value={list.filter((a) => a.status === "Pending").length} tone="red" />
          <StatCard label="Completed services" value={completed.length} tone="green" />
        </div>
        <div className="grid cols-2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-title"><h2>Upcoming appointments</h2><Link to="/customer/appointments">View all</Link></div>
            {upcoming.length === 0 ? (
              <EmptyState title="Nothing scheduled" text="Book a service to see it here." action={<Link className="btn primary sm" to="/customer/book">Book a service</Link>} />
            ) : (
              <div className="stack">
                {upcoming.map((a) => (
                  <div className="row between" key={a.id}>
                    <div>
                      <strong>{a.service.name}</strong>
                      <div className="muted">{a.vehicle.brand} {a.vehicle.model} - {fmtDate(a.appointment_date)}, {fmtTime(a.time_slot)}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-title"><h2>Recent service history</h2><Link to="/customer/history">View all</Link></div>
            {completed.length === 0 ? (
              <EmptyState title="No completed services yet" text="Finished jobs will appear here." />
            ) : (
              <div className="stack">
                {completed.slice(0, 5).map((a) => (
                  <div className="row between" key={a.id}>
                    <div>
                      <strong>{a.service.name}</strong>
                      <div className="muted">{a.vehicle.reg_number} - {fmtDate(a.completion_date || a.appointment_date)}</div>
                    </div>
                    <strong>{money(a.invoice_total ?? a.charges)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DataState>
    </>
  );
}
