import useFetch from "../../hooks/useFetch";
import { DataState, PageHeader, StatCard } from "../../components/ui";
import ChartCanvas from "../../components/Chart";
import { money } from "../../utils/format";

function ChartCard({ title, children }) {
  return <div className="card"><h2>{title}</h2>{children}</div>;
}

export default function Reports() {
  const { data, loading, error, reload } = useFetch("/admin/reports");
  return (
    <>
      <PageHeader title="Reports and analytics" subtitle="Calculated live from bookings and recorded payments.">
        <button className="btn" onClick={reload}>Refresh</button>
      </PageHeader>
      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="grid cols-4">
              <StatCard label="Completed services" value={data.completion.completed} tone="green" />
              <StatCard label="Pending services" value={data.completion.pending} tone="amber" hint="Not yet completed" />
              <StatCard label="Total revenue" value={money(data.total_revenue)} />
              <StatCard label="Customers" value={data.customers.total} hint={`${data.customers.new_this_month} new this month`} />
            </div>
            <div className="grid cols-2" style={{ marginTop: 20 }}>
              <ChartCard title="Daily appointments (last 14 days)"><ChartCanvas type="line" labels={data.daily_appointments.labels} values={data.daily_appointments.values} label="Appointments" /></ChartCard>
              <ChartCard title="Monthly appointments"><ChartCanvas type="bar" labels={data.monthly_appointments.labels} values={data.monthly_appointments.values} label="Appointments" /></ChartCard>
              <ChartCard title="Monthly revenue"><ChartCanvas type="bar" labels={data.monthly_revenue.labels} values={data.monthly_revenue.values} label="Revenue" money colors={["#1a8f5a"]} /></ChartCard>
              <ChartCard title="Popular service categories"><ChartCanvas type="doughnut" labels={data.popular_services.labels} values={data.popular_services.values} /></ChartCard>
              <ChartCard title="Completed vs pending">
                <ChartCanvas type="doughnut" labels={["Completed", "Pending", "Cancelled or rejected"]} values={[data.completion.completed, data.completion.pending, data.completion.cancelled_or_rejected]} colors={["#1a8f5a", "#f2a900", "#c0392b"]} />
              </ChartCard>
              <div className="card">
                <h2>Customer statistics</h2>
                <dl className="details">
                  <div><dt>Total customers</dt><dd>{data.customers.total}</dd></div>
                  <div><dt>Active accounts</dt><dd>{data.customers.active}</dd></div>
                  <div><dt>New this month</dt><dd>{data.customers.new_this_month}</dd></div>
                  <div><dt>Customers with bookings</dt><dd>{data.customers.with_bookings}</dd></div>
                  <div><dt>Repeat customers</dt><dd>{data.customers.repeat_customers}</dd></div>
                </dl>
              </div>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
