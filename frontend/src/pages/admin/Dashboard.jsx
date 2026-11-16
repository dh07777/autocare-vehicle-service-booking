import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { DataState, EmptyState, PageHeader, StatCard, StatusBadge } from "../../components/ui";
import ChartCanvas from "../../components/Chart";
import { fmtDate, fmtTime, money } from "../../utils/format";

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch("/admin/dashboard");
  const t = data?.totals;
  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Live numbers from the workshop database.">
        <Link className="btn primary" to="/admin/appointments">Manage appointments</Link>
      </PageHeader>
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid cols-4">
              <StatCard label="Total customers" value={t.customers} />
              <StatCard label="Total vehicles" value={t.vehicles} />
              <StatCard label="Total appointments" value={t.appointments} tone="amber" />
              <StatCard label="Pending bookings" value={t.pending} tone="red" hint="Waiting for approval" />
              <StatCard label="Completed services" value={t.completed} tone="green" />
              <StatCard label="Revenue from payments" value={money(t.revenue)} tone="green" />
            </div>
            <div className="grid cols-2" style={{ marginTop: 20 }}>
              <div className="card">
                <h2>Revenue by month</h2>
                <ChartCanvas type="bar" labels={data.revenue_chart.labels} values={data.revenue_chart.values} label="Revenue" money />
              </div>
              <div className="card">
                <h2>Appointments by status</h2>
                {data.appointment_statistics.values.length === 0 ? <EmptyState title="No appointments yet" /> : (
                  <ChartCanvas type="doughnut" labels={data.appointment_statistics.labels} values={data.appointment_statistics.values} />
                )}
              </div>
            </div>
            <div className="card flush table-wrap" style={{ marginTop: 20 }}>
              <div className="card-title" style={{ padding: "16px 20px 0" }}><h2>Recent bookings</h2><Link to="/admin/appointments">View all</Link></div>
              {data.recent_bookings.length === 0 ? <EmptyState title="No bookings yet" /> : (
                <table>
                  <thead><tr><th>Booking</th><th>Customer</th><th>Service</th><th>When</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.recent_bookings.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.booking_id}</strong></td>
                        <td>{a.customer.name}</td>
                        <td>{a.service.name}</td>
                        <td className="nowrap">{fmtDate(a.appointment_date)}, {fmtTime(a.time_slot)}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
